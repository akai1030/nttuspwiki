/**
 * 幹部帳號供裝 — 建立 / 更新一個可登入的幹部帳號（email 白名單 + scrypt 密碼）。
 * 沒有公開註冊；帳號一律由管理員在此建立（CLAUDE.md 公開/私密邊界）。
 *
 * 用法（PowerShell，參數用 key=value；password 建議用引號包住）：
 *   npm run auth:create -- email=you@example.com password="至少八碼" role=admin name="王小明"
 *
 * role 預設 officer；email 會轉小寫。冪等：同 email 再跑一次＝重設密碼/角色/姓名。
 * 註：密碼會出現在 shell 歷史，供裝後請自行清理或改密。
 */
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../lib/auth/password";

const prisma = new PrismaClient();

const VALID_ROLES = ["admin", "officer", "viewer"] as const;

function parseArgs(argv: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const tok of argv) {
    const eq = tok.indexOf("=");
    if (eq === -1) continue;
    out[tok.slice(0, eq).trim().toLowerCase()] = tok.slice(eq + 1);
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const email = (args.email ?? "").trim().toLowerCase();
  const password = args.password ?? "";
  const role = (args.role ?? "officer").trim().toLowerCase();
  const name = args.name?.trim() || null;

  const errors: string[] = [];
  if (!email || !email.includes("@")) errors.push("email 缺少或格式不對（需含 @）");
  if (password.length < 8) errors.push("password 至少 8 碼");
  if (!VALID_ROLES.includes(role as (typeof VALID_ROLES)[number]))
    errors.push(`role 需為 ${VALID_ROLES.join(" / ")}`);
  if (errors.length) {
    console.error("✗ 參數有誤：\n  - " + errors.join("\n  - "));
    console.error(
      '\n用法：npm run auth:create -- email=you@example.com password="至少八碼" role=admin name="王小明"'
    );
    process.exitCode = 1;
    return;
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.upsert({
    where: { email },
    update: { passwordHash, role, name },
    create: { email, passwordHash, role, name },
  });

  console.log(`✔ 帳號已就緒：${user.email}（${user.role}${user.name ? "・" + user.name : ""}）`);
  console.log("  可至 /login 以此信箱與密碼登入。");
}

main()
  .catch((e) => {
    console.error("✗ 供裝失敗：", e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
