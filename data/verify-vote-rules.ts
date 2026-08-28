/**
 * 驗證 data/vote-rules.json 的每一筆引文都還對得上法規原文。
 *   npm run verify:vote-rules
 *
 * 檢查三件事（任一不過就 exit 1）：
 *   1. lawNumber 找得到該部法規，且 lawName 與來源逐字相同
 *   2. article 在該部法規中存在
 *   3. quote 是該條全文的「精確子字串」（不做正規化、不去空白、不容錯）
 *
 * 另外複驗「查無規定」清單仍然是 0 命中 —— 法規一旦修正而新增了這些字，
 * vote-rules.ts 檔頭的聲明就過期了，必須有人回來看。
 *
 * 來源：法規MD轉檔/法規結構化-第20屆.json（與 data/seed.ts 同一份）。
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import type { VoteRule } from "@/lib/meetings/vote-rules";

type SourceArticle = { number: string | number; name?: string; items?: string[] };
type SourceLaw = { number: string; name: string; articles?: SourceArticle[] };

const ROOT = process.cwd();
const rules = JSON.parse(readFileSync(path.join(ROOT, "data/vote-rules.json"), "utf8")) as VoteRule[];
const laws = JSON.parse(
  readFileSync(path.join(ROOT, "法規MD轉檔/法規結構化-第20屆.json"), "utf8")
) as SourceLaw[];

/** 這些詞在 38 部法規中應維持 0 命中；有命中代表法規修過，聲明要重寫。 */
const MUST_BE_ABSENT = [
  "匿名",
  "棄權",
  "廢票",
  "舉手",
  "唱名",
  "起立",
  "視訊",
  "遠距",
  "直播",
  "轉播",
  "委託投票",
  "代理表決",
];

let bad = 0;
const fail = (msg: string) => {
  console.error(`✗ ${msg}`);
  bad += 1;
};

for (const r of rules) {
  const law = laws.find((x) => x.number === r.lawNumber);
  if (!law) {
    fail(`${r.id}：找不到法規 ${r.lawNumber}`);
    continue;
  }
  if (law.name !== r.lawName) {
    fail(`${r.id}：法規名不符\n    來源：${law.name}\n    資料：${r.lawName}`);
  }
  const a = (law.articles ?? []).find((x) => String(x.number) === String(r.article));
  if (!a) {
    fail(`${r.id}：${r.lawNumber} 無第 ${r.article} 條`);
    continue;
  }
  const body = (a.items ?? []).join("");
  if (!body.includes(r.quote)) {
    fail(`${r.id}：引文非原文精確子字串\n    引文：${r.quote}\n    原文：${body.slice(0, 240)}`);
  }
}

// thresholdRules 的結構檢查：分母不得為 0；能換算者比例必須落在 (0, 1]。
for (const r of rules) {
  for (const t of r.thresholdRules ?? []) {
    if (t.den === 0) fail(`${r.id}：thresholdRule 分母為 0`);
    if (t.comparator !== null) {
      if (t.num <= 0 || t.num > t.den) fail(`${r.id}：比例 ${t.num}/${t.den} 不在 (0, 1]`);
      if (!t.base) fail(`${r.id}：thresholdRule 缺 base`);
    } else if (!t.unresolvedNote) {
      fail(`${r.id}：comparator 為 null 卻沒寫 unresolvedNote（必須說明為什麼算不出來）`);
    }
  }
}

const allText = laws.flatMap((l) => (l.articles ?? []).flatMap((a) => a.items ?? [])).join("\n");
for (const kw of MUST_BE_ABSENT) {
  if (allText.includes(kw)) {
    fail(`「${kw}」已出現在法規中（原本為 0 命中）。lib/meetings/vote-rules.ts 檔頭的聲明需重寫。`);
  }
}

if (bad === 0) {
  console.log(`✓ vote-rules.json ${rules.length} 筆：法規名、條號、引文逐字皆與來源相符`);
  console.log(`✓ 查無規定清單 ${MUST_BE_ABSENT.length} 詞仍為 0 命中`);
} else {
  console.error(`\n${bad} 項未通過。`);
  process.exitCode = 1;
}
