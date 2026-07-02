/**
 * Phase 0-4 資料保真驗證（PROMPTS.md 0-4）：把關 PDF→MD/JSON→DB 不轉錯。
 *
 *   1) 計數：38 部 / 733 條 + 五類分佈 + 每部條數與 JSON 一致
 *   2) 逐條逐字比對：DB.Article ↔ JSON（body / items / 條名 / 章 / 沿革 / 前言）
 *   3) 健康檢查：U+FFFD 亂碼、空白條文、條號跳號/重複、款項異常
 *   4) 回源抽查：用 parse_laws.py（同源，需 pdftotext）重抽，隨機 20 條比對
 *
 * 輸出報告：data/verify-report.md。有任何 ❌ → exit 1（停手問人，絕不自行修改法條原文）。
 * 無 DATABASE_URL 時：1/3/4 的 JSON 層照跑，DB 項標記「待跑」。
 * 用法：npm run db:verify
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  JSON_PATH,
  PROJECT_ROOT,
  articleBody,
  loadLaws,
  type JsonLaw,
} from "./shared";

// 基準來自 法規MD轉檔/README.md（第20屆語料事實）。
// 注意：此基準與 JSON 出自同一次解析（循環基準），只能擋「與上次不同」，
// 擋不住「上次就錯」——所以另有 0 條法規檢查、附條連續性檢查與人工抽對 PDF。
// 2026-07-02 更新：修 parse_laws.py 的中文數字條號 bug 後重抽，總條數 733→768。
// 2.5/2.6/4.3 從 0 條修為 6/9/20 條（+35）；其餘 35 部條數不變。舊 733 是低估的錯值。
const EXPECTED = {
  laws: 38,
  articles: 768,
  categories: {
    最高章程: { laws: 3, articles: 77 },
    行政: { laws: 20, articles: 318 },
    立法: { laws: 10, articles: 218 },
    司法: { laws: 1, articles: 25 },
    選舉: { laws: 4, articles: 130 },
  } as Record<string, { laws: number; articles: number }>,
};

const SESSION_DIR = path.join(
  PROJECT_ROOT,
  "01｜公開檢閱資料",
  "01｜【國立臺東大學學生會】法律規定",
  "20.第二十屆學生議會學生自治法規"
);
const PARSER = path.join(PROJECT_ROOT, "法規MD轉檔", "parse_laws.py");

type Level = "pass" | "fail" | "warn" | "skip";
interface Finding {
  level: Level;
  text: string;
}
const sections: [string, Finding[]][] = [];
function section(title: string): (level: Level, text: string) => void {
  const list: Finding[] = [];
  sections.push([title, list]);
  return (level, text) => list.push({ level, text });
}

// ── 1. 計數 ─────────────────────────────────────────────
function checkCounts(laws: JsonLaw[]) {
  const add = section("1. 計數（JSON 層）");
  const totalArticles = laws.reduce((n, l) => n + l.articles.length, 0);

  add(
    laws.length === EXPECTED.laws ? "pass" : "fail",
    `法規數：${laws.length}（預期 ${EXPECTED.laws}）`
  );
  add(
    totalArticles === EXPECTED.articles ? "pass" : "fail",
    `條文數：${totalArticles}（預期 ${EXPECTED.articles}）`
  );

  for (const [cat, exp] of Object.entries(EXPECTED.categories)) {
    const catLaws = laws.filter((l) => l.category === cat);
    const catArticles = catLaws.reduce((n, l) => n + l.articles.length, 0);
    add(
      catLaws.length === exp.laws && catArticles === exp.articles
        ? "pass"
        : "fail",
      `${cat}：${catLaws.length} 部 / ${catArticles} 條（預期 ${exp.laws} 部 / ${exp.articles} 條）`
    );
  }

  let inconsistent = 0;
  for (const l of laws) {
    if (l.articles.length !== l.article_count) {
      inconsistent += 1;
      add(
        "fail",
        `JSON 內部不一致：${l.number}《${l.name}》articles=${l.articles.length}、article_count=${l.article_count}`
      );
    }
  }
  if (inconsistent === 0) add("pass", "每部法規 articles 長度 === article_count");
}

// ── 2. DB 逐條逐字比對 ──────────────────────────────────
async function checkDb(laws: JsonLaw[]) {
  const add = section("2. DB 逐條逐字比對");
  if (!process.env.DATABASE_URL) {
    add("skip", "DATABASE_URL 未設定（.env 尚未建立）— 灌種子後必須回來跑這段");
    return;
  }
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();
  try {
    const dbLaws = await prisma.law.findMany({
      where: { session: 20 },
      include: {
        articles: true,
        amendments: { orderBy: [{ date: "asc" }, { id: "asc" }] },
      },
    });
    add(
      dbLaws.length === laws.length ? "pass" : "fail",
      `DB 法規數：${dbLaws.length}（JSON ${laws.length}）`
    );

    const byNumber = new Map(dbLaws.map((l) => [l.number, l]));
    let mismatches = 0;
    for (const jl of laws) {
      const dl = byNumber.get(jl.number);
      if (!dl) {
        mismatches += 1;
        add("fail", `DB 缺法規：${jl.number}《${jl.name}》`);
        continue;
      }
      if (dl.name !== jl.name) {
        mismatches += 1;
        add("fail", `法規名不符：${jl.number} DB「${dl.name}」/ JSON「${jl.name}」`);
      }
      if (dl.category !== jl.category) {
        mismatches += 1;
        add("fail", `類別不符：${jl.number}（DB ${dl.category} / JSON ${jl.category}）`);
      }
      if ((dl.currentType ?? null) !== (jl.current_type ?? null)) {
        mismatches += 1;
        add("fail", `現行版本類型不符：${jl.number}（DB ${dl.currentType} / JSON ${jl.current_type}）`);
      }
      if ((dl.sourceFile ?? null) !== (jl.file ?? null)) {
        mismatches += 1;
        add("fail", `sourceFile 不符：${jl.number}（人工覆核回溯 PDF 的線索）`);
      }
      if ((dl.preamble ?? null) !== (jl.preamble || null)) {
        mismatches += 1;
        add("fail", `前言不符：${jl.number}《${jl.name}》`);
      }
      const dbDate = dl.currentDate?.toISOString().slice(0, 10) ?? null;
      if (dbDate !== jl.current_date) {
        mismatches += 1;
        add("fail", `現行日期不符：${jl.number}（DB ${dbDate} / JSON ${jl.current_date}）`);
      }

      const dbArts = new Map(dl.articles.map((a) => [a.number, a]));
      if (dl.articles.length !== jl.articles.length) {
        mismatches += 1;
        add(
          "fail",
          `條數不符：${jl.number}《${jl.name}》DB ${dl.articles.length} / JSON ${jl.articles.length}`
        );
      }
      for (const ja of jl.articles) {
        const da = dbArts.get(ja.number);
        if (!da) {
          mismatches += 1;
          add("fail", `DB 缺條文：${jl.number}《${jl.name}》第 ${ja.number} 條`);
          continue;
        }
        if (da.body !== articleBody(ja.items)) {
          mismatches += 1;
          add("fail", `條文內容不符：${jl.number}《${jl.name}》第 ${ja.number} 條（逐字比對失敗）`);
        }
        if (JSON.stringify(da.items) !== JSON.stringify(ja.items)) {
          mismatches += 1;
          add("fail", `款項結構不符：${jl.number}《${jl.name}》第 ${ja.number} 條`);
        }
        if ((da.name ?? null) !== (ja.name || null)) {
          mismatches += 1;
          add("fail", `條名不符：${jl.number}《${jl.name}》第 ${ja.number} 條`);
        }
        if ((da.chapter ?? null) !== (ja.chapter ?? null)) {
          mismatches += 1;
          add("fail", `章別不符：${jl.number}《${jl.name}》第 ${ja.number} 條`);
        }
      }

      // 沿革：排序後逐筆比對（date/roc/action/text）
      const jAmends = [...jl.amendment_history].sort((a, b) =>
        `${a.date}|${a.text}`.localeCompare(`${b.date}|${b.text}`)
      );
      const dAmends = [...dl.amendments].sort((a, b) =>
        `${a.date.toISOString().slice(0, 10)}|${a.text}`.localeCompare(
          `${b.date.toISOString().slice(0, 10)}|${b.text}`
        )
      );
      if (jAmends.length !== dAmends.length) {
        mismatches += 1;
        add(
          "fail",
          `沿革筆數不符：${jl.number}《${jl.name}》DB ${dAmends.length} / JSON ${jAmends.length}`
        );
      } else {
        for (let i = 0; i < jAmends.length; i += 1) {
          const j = jAmends[i];
          const d = dAmends[i];
          if (
            d.date.toISOString().slice(0, 10) !== j.date ||
            d.roc !== j.roc ||
            d.action !== j.action ||
            d.text !== j.text ||
            (d.sessionTerm ?? null) !== (j.session_term ?? null)
          ) {
            mismatches += 1;
            add("fail", `沿革內容不符：${jl.number}《${jl.name}》（${j.roc}）`);
          }
        }
      }
    }
    if (mismatches === 0)
      add(
        "pass",
        `全部 ${laws.length} 部 / ${EXPECTED.articles} 條逐字比對一致（body/items/條名/章/前言/沿革/類別/版本欄位/sourceFile）`
      );
  } catch (e) {
    add("fail", `DB 連線或查詢失敗：${e instanceof Error ? e.message : String(e)}`);
  } finally {
    await prisma.$disconnect();
  }
}

// ── 3. 健康檢查（JSON 層）───────────────────────────────
function checkHealth(laws: JsonLaw[]) {
  const add = section("3. 健康檢查（JSON 層）");
  let mojibake = 0;
  let emptyItem = 0;
  let dupes = 0;
  let gaps = 0;
  let zeroArticle = 0;

  for (const l of laws) {
    // 整部法規 0 條 = 最嚴重的轉換錯誤：條文層資料全數漏失（通常被解析器整包塞進前言）
    if (l.articles.length === 0) {
      zeroArticle += 1;
      add(
        "fail",
        `整部法規 0 條：${l.number}《${l.name}》articles 為空（前言 ${l.preamble?.length ?? 0} 字，疑似全文被解析進前言）— 需修 parse_laws.py 後重轉，絕不手改 JSON`
      );
    }

    const texts: [string, string][] = [
      [`${l.number} 法規名`, l.name],
      [`${l.number} 標題`, l.title ?? ""],
      [`${l.number} 前言`, l.preamble ?? ""],
      ...l.amendment_history.map(
        (h, i) => [`${l.number} 沿革#${i + 1}`, h.text] as [string, string]
      ),
      ...l.articles.flatMap((a) => [
        [`${l.number}《${l.name}》第 ${a.number} 條條名`, a.name ?? ""] as [
          string,
          string,
        ],
        [`${l.number}《${l.name}》第 ${a.number} 條章名`, a.chapter ?? ""] as [
          string,
          string,
        ],
        ...a.items.map(
          (it, i) =>
            [`${l.number}《${l.name}》第 ${a.number} 條款項#${i + 1}`, it] as [
              string,
              string,
            ]
        ),
      ]),
    ];
    for (const [where, text] of texts) {
      if (text.includes("�")) {
        mojibake += 1;
        add("fail", `U+FFFD 亂碼：${where}`);
      }
    }

    const seen = new Set<string>();
    let prevMain = 0;
    let prevSub = 0;
    for (const a of l.articles) {
      if (a.items.length === 0) {
        emptyItem += 1;
        add("fail", `空白條文：${l.number}《${l.name}》第 ${a.number} 條（0 款項）`);
      }
      if (a.items.some((it) => it.trim().length === 0)) {
        emptyItem += 1;
        add("fail", `空白款項：${l.number}《${l.name}》第 ${a.number} 條`);
      }
      if (seen.has(a.number)) {
        dupes += 1;
        add("fail", `條號重複：${l.number}《${l.name}》第 ${a.number} 條`);
      }
      seen.add(a.number);

      const m = a.number.match(/^(\d+)(?:-(\d+))?$/);
      if (!m) {
        add("warn", `條號格式異常：${l.number}《${l.name}》「${a.number}」`);
        continue;
      }
      const main = Number(m[1]);
      if (!m[2]) {
        if (main !== prevMain + 1) {
          gaps += 1;
          add(
            "warn",
            `條號跳號：${l.number}《${l.name}》第 ${prevMain} 條之後接第 ${a.number} 條`
          );
        }
        prevMain = main;
        prevSub = 0;
      } else {
        const sub = Number(m[2]);
        if (main !== prevMain) {
          gaps += 1;
          add(
            "warn",
            `附條編號異常：${l.number}《${l.name}》第 ${a.number} 條出現在第 ${prevMain} 條之後`
          );
        } else if (sub !== prevSub + 1) {
          gaps += 1;
          add(
            "warn",
            `附條跳號：${l.number}《${l.name}》第 ${prevMain}${prevSub > 0 ? `-${prevSub}` : ""} 條之後接第 ${a.number} 條`
          );
        }
        prevSub = sub;
      }
    }
  }

  if (zeroArticle === 0) add("pass", "無整部 0 條的法規");
  if (mojibake === 0) add("pass", "無 U+FFFD 亂碼（含標題/條名/章名）");
  if (emptyItem === 0) add("pass", "無空白條文 / 空白款項");
  if (dupes === 0) add("pass", "無條號重複");
  if (gaps === 0) add("pass", "條號連續（含 n-m 附條規則）");
}

// ── 4. 回源抽查（parse_laws.py 同源重抽）────────────────
// Windows 的 Microsoft Store 執行別名會讓未安裝的工具 spawn「成功」但 exit 9009，
// 必須連 status 一起判，否則「工具不可用」會被誤報成「資料驗證失敗」。
const STORE_STUB_EXIT = 9009;

function checkSource(laws: JsonLaw[]) {
  const add = section("4. 回源比對（PDF 同源重抽 · 全量）");

  const hasPdftotext = spawnSync("pdftotext", ["-v"], { encoding: "utf8" });
  if (hasPdftotext.error || hasPdftotext.status === STORE_STUB_EXIT) {
    add(
      "skip",
      "pdftotext（poppler）未安裝，parse_laws.py 無法重抽。安裝後重跑：winget install poppler（或 choco install poppler）"
    );
    return;
  }
  const hasPython = spawnSync("python", ["--version"], { encoding: "utf8" });
  if (hasPython.error || hasPython.status !== 0) {
    add("skip", "python 不可用（或僅有 Store 執行別名），無法執行 parse_laws.py");
    return;
  }
  if (!existsSync(SESSION_DIR)) {
    add("skip", `找不到原始 PDF 資料夾：${SESSION_DIR}`);
    return;
  }

  const outDir = mkdtempSync(path.join(os.tmpdir(), "nttuspwiki-verify-"));
  const run = spawnSync(
    "python",
    [PARSER, SESSION_DIR, outDir, "第20屆"],
    { encoding: "utf8", timeout: 300_000 }
  );
  if (run.status !== 0) {
    add("fail", `parse_laws.py 執行失敗：${(run.stderr || run.stdout || "").slice(0, 500)}`);
    return;
  }

  const reparsed = loadLaws(path.join(outDir, "法規結構化-第20屆.json"));
  const reByNumber = new Map(reparsed.map((l) => [l.number, l]));

  // 重抽已自動化，全量比對與抽 20 條成本相同 → 直接比對 38 部 law 層欄位 + 全部條文
  //（涵蓋前言/沿革/章結構/條名/章名/款項，0 條法規也在 law 層被涵蓋）
  let bad = 0;
  for (const l of laws) {
    const rl = reByNumber.get(l.number);
    if (!rl) {
      bad += 1;
      add("fail", `重抽缺法規：${l.number}《${l.name}》`);
      continue;
    }
    if (
      rl.name !== l.name ||
      rl.title !== l.title ||
      rl.current_date !== l.current_date ||
      (rl.preamble ?? "") !== (l.preamble ?? "") ||
      JSON.stringify(rl.chapters) !== JSON.stringify(l.chapters) ||
      JSON.stringify(rl.amendment_history) !== JSON.stringify(l.amendment_history)
    ) {
      bad += 1;
      add("fail", `重抽 law 層欄位不符（解析漂移）：${l.number}《${l.name}》`);
    }
    if (rl.articles.length !== l.articles.length) {
      bad += 1;
      add(
        "fail",
        `重抽條數不符：${l.number}《${l.name}》重抽 ${rl.articles.length} / 現存 ${l.articles.length}`
      );
    }
    const reArts = new Map(rl.articles.map((a) => [a.number, a]));
    for (const a of l.articles) {
      const ra = reArts.get(a.number);
      if (!ra) {
        bad += 1;
        add("fail", `重抽缺條文：${l.number}《${l.name}》第 ${a.number} 條`);
        continue;
      }
      if (
        JSON.stringify(ra.items) !== JSON.stringify(a.items) ||
        (ra.name ?? "") !== (a.name ?? "") ||
        (ra.chapter ?? null) !== (a.chapter ?? null)
      ) {
        bad += 1;
        add(
          "fail",
          `重抽內容不符（解析漂移）：${l.number}《${l.name}》第 ${a.number} 條`
        );
      }
    }
  }
  if (bad === 0)
    add(
      "pass",
      "PDF 同源重抽全量一致（38 部 law 層欄位 + 全部條文 items/條名/章名），無解析漂移"
    );
}

// ── 報告輸出 ────────────────────────────────────────────
const ICON: Record<Level, string> = {
  pass: "✅",
  fail: "❌",
  warn: "⚠️",
  skip: "⏸️",
};

async function main() {
  const laws = loadLaws();

  checkCounts(laws);
  await checkDb(laws);
  checkHealth(laws);
  checkSource(laws);

  const all = sections.flatMap(([, list]) => list);
  const counts = {
    pass: all.filter((f) => f.level === "pass").length,
    fail: all.filter((f) => f.level === "fail").length,
    warn: all.filter((f) => f.level === "warn").length,
    skip: all.filter((f) => f.level === "skip").length,
  };

  const lines: string[] = [
    "# 資料保真驗證報告（Phase 0-4）",
    "",
    `> 產生時間：${new Date().toISOString()} · 來源：\`${path.relative(PROJECT_ROOT, JSON_PATH)}\``,
    `> 結果：✅ ${counts.pass} 項通過 · ❌ ${counts.fail} 項失敗 · ⚠️ ${counts.warn} 項警告 · ⏸️ ${counts.skip} 項待跑`,
    "",
    counts.fail > 0
      ? "**❌ 有失敗項：停手，回報作者人工確認。絕不自行修改法條原文（資料保真紅線）。**"
      : counts.skip > 0
        ? "**尚有待跑項（見下）；已跑項目全數通過。**"
        : "**全數通過。**",
    "",
  ];
  for (const [title, list] of sections) {
    lines.push(`## ${title}`, "");
    for (const f of list) lines.push(`- ${ICON[f.level]} ${f.text}`);
    lines.push("");
  }

  const reportPath = path.join(PROJECT_ROOT, "data", "verify-report.md");
  writeFileSync(reportPath, lines.join("\n"), "utf8");
  console.log(lines.join("\n"));
  console.log(`\n報告已寫入 ${reportPath}`);

  if (counts.fail > 0) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
