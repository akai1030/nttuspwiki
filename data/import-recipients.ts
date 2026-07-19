/**
 * 議員名冊匯入 — 把選舉產生的當屆議員名冊灌進 Recipient（會議通知收件人 + 完整名冊）。
 * 資料來源是 data/roster-session{N}.json（由選舉結果 xlsx 轉檔而來，見該檔 source 欄）。
 *
 * 用法（PowerShell）：
 *   npm run import:recipients                 # 匯入 data/roster-session21.json（預設）
 *   npm run import:recipients -- --dry        # 只預覽、不寫入
 *   npm run import:recipients -- file=data/roster-session22.json
 *
 * 冪等：以 (session, studentId) 為鍵 upsert。同一份名冊重跑＝更新，不會產生重複列。
 * roleTag 一律「議員」、active=true。非議員（列席/旁聽/祕書處）請走後台手加，不經此腳本。
 * 個資邊界：這些欄位（含手機/學號）永不進公開路由（沿用會議營運模組邊界）。
 */
import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type Member = {
  district: string;
  name: string;
  department: string;
  grade: string;
  studentId: string;
  email: string;
  phone: string;
  roleTag?: string;
};
type Roster = { session: number; term?: string; count?: number; members: Member[] };

function parseArgs(argv: string[]) {
  const out: { file: string; dry: boolean } = { file: "data/roster-session21.json", dry: false };
  for (const tok of argv) {
    if (tok === "--dry" || tok === "dry=1") out.dry = true;
    else if (tok.startsWith("file=")) out.file = tok.slice(5);
  }
  return out;
}

function validate(m: Member, i: number): string[] {
  const errs: string[] = [];
  if (!m.name?.trim()) errs.push(`第${i + 1}筆缺姓名`);
  if (!m.email || !m.email.includes("@")) errs.push(`${m.name || i + 1}：email 格式不對`);
  if (!/^\d{8}$/.test(m.studentId ?? "")) errs.push(`${m.name || i + 1}：學號需 8 碼數字（得「${m.studentId}」）`);
  return errs;
}

async function main() {
  const { file, dry } = parseArgs(process.argv.slice(2));
  const roster = JSON.parse(readFileSync(file, "utf8")) as Roster;
  const session = roster.session;
  const members = roster.members ?? [];

  if (!Number.isInteger(session)) {
    console.error(`✗ ${file} 缺少有效 session（屆別）`);
    process.exitCode = 1;
    return;
  }

  // 驗證 + 名冊內去重（學號/email 不得重複）
  const errs = members.flatMap(validate);
  const sids = members.map((m) => m.studentId);
  const emails = members.map((m) => m.email.toLowerCase());
  for (const s of new Set(sids)) if (sids.filter((x) => x === s).length > 1) errs.push(`學號重複：${s}`);
  for (const e of new Set(emails)) if (emails.filter((x) => x === e).length > 1) errs.push(`email 重複：${e}`);
  if (errs.length) {
    console.error(`✗ 名冊驗證未過（${file}）：\n  - ` + errs.join("\n  - "));
    process.exitCode = 1;
    return;
  }

  console.log(`第${session}屆名冊：${members.length} 筆${dry ? "（--dry 預覽，不寫入）" : ""}`);

  let created = 0;
  let updated = 0;
  for (const m of members) {
    const data = {
      session,
      name: m.name.trim(),
      email: m.email.trim().toLowerCase(),
      roleTag: m.roleTag?.trim() || "議員",
      district: m.district?.trim() || null,
      department: m.department?.trim() || null,
      grade: m.grade?.trim() || null,
      studentId: m.studentId.trim(),
      phone: m.phone?.trim() || null,
    };
    if (dry) {
      console.log(`  · ${data.studentId} ${data.name}（${data.district}）<${data.email}>`);
      continue;
    }
    const existing = await prisma.recipient.findUnique({
      where: { session_studentId: { session, studentId: data.studentId } },
      select: { id: true },
    });
    await prisma.recipient.upsert({
      where: { session_studentId: { session, studentId: data.studentId } },
      // 更新時保留 active 現況（幹部可能已停用某人），只覆蓋名冊欄位
      update: {
        name: data.name,
        email: data.email,
        roleTag: data.roleTag,
        district: data.district,
        department: data.department,
        grade: data.grade,
        phone: data.phone,
      },
      create: data,
    });
    if (existing) updated++;
    else created++;
  }

  if (!dry) {
    const total = await prisma.recipient.count({ where: { session, roleTag: "議員" } });
    console.log(`✔ 完成：新增 ${created}、更新 ${updated}。第${session}屆議員收件人現有 ${total} 位。`);
  }
}

main()
  .catch((e) => {
    console.error("✗ 匯入失敗：", e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
