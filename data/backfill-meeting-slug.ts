/**
 * 回填 Meeting.slug（需求 D）。
 *
 * 預設 dry-run：只印 id → slug 對照表，不寫入。確認後加 --apply 才真的寫。
 *   npx tsx data/backfill-meeting-slug.ts            # 看對照表
 *   npx tsx data/backfill-meeting-slug.ts --apply    # 寫入
 *
 * 還原：slug 可為 NULL，且查詢層仍吃 cuid，所以還原只要清空欄位：
 *   UPDATE "Meeting" SET slug = NULL;
 * 執行 --apply 時會把這行連同逐筆的還原 SQL 印出來。
 *
 * 冪等：已有 slug 的列一律跳過，不覆蓋（幹部可能已手動改過）。
 */
import { prisma } from "@/lib/db";
import { buildMeetingSlug, pickAvailableSlug, type MeetingKindLike } from "@/lib/meetings/slug";

async function main() {
  const apply = process.argv.includes("--apply");

  const rows = await prisma.meeting.findMany({
    orderBy: { meetingAt: "asc" },
    select: { id: true, slug: true, session: true, academicYear: true, kind: true, meetingAt: true, name: true },
  });

  const taken = new Set(rows.map((r) => r.slug).filter((x): x is string => Boolean(x)));
  const plan: { id: string; name: string; slug: string }[] = [];

  for (const r of rows) {
    if (r.slug) continue; // 已有 slug（含手動改過的）→ 不動
    const base = buildMeetingSlug({
      session: r.session,
      academicYear: r.academicYear,
      kind: r.kind as MeetingKindLike,
      meetingAt: r.meetingAt,
    });
    const slug = pickAvailableSlug(base, taken);
    taken.add(slug);
    plan.push({ id: r.id, name: r.name, slug });
  }

  console.log(`會議共 ${rows.length} 場，已有 slug ${rows.length - plan.length} 場，待回填 ${plan.length} 場。`);
  if (plan.length === 0) {
    console.log("沒有需要回填的資料。");
    return;
  }

  console.log("\n對照表：");
  console.log("id".padEnd(28) + "slug".padEnd(30) + "會議名稱");
  for (const p of plan) {
    console.log(p.id.padEnd(28) + p.slug.padEnd(30) + p.name);
  }

  if (!apply) {
    console.log("\n（dry-run。確認無誤後加 --apply 寫入。）");
    return;
  }

  for (const p of plan) {
    await prisma.meeting.update({ where: { id: p.id }, data: { slug: p.slug } });
  }
  console.log(`\n已寫入 ${plan.length} 筆。`);

  console.log("\n還原用 SQL（整批）：");
  console.log(`UPDATE "Meeting" SET slug = NULL WHERE id IN (${plan.map((p) => `'${p.id}'`).join(", ")});`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
