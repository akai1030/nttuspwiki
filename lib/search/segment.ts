/**
 * 中文斷詞（@node-rs/jieba + 繁體字典 dict.txt.big）。
 *
 * 為什麼是這組（見 Phase 2 決策）：法規是**繁體**，jieba 預設字典是簡體 → 繁體詞會被拆成單字；
 * 換上 dict.txt.big（含繁體）斷詞才正確。@node-rs/jieba 是 Rust 預編譯（免 C++ build、無 CJK 路徑
 * 問題、本機+線上都穩），且字典以 Buffer 傳入（由 Node 讀檔，避開 native ifstream 對 CJK 路徑的坑）。
 *
 * 索引與查詢共用同一套斷詞（tsvector 用 'simple' config：只小寫+空白切分，不做英文詞幹/停用詞，
 * 正好吃我們預先斷好的中文 token）。
 */
import { Jieba } from "@node-rs/jieba";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import path from "node:path";

// 字典放 repo（gzip ~3MB）。用 Node fs 讀（處理 CJK 路徑沒問題），解壓後以 Buffer 交給 jieba。
// 部署（Next standalone）需在 next.config 的 outputFileTracingIncludes 帶上此檔（Phase 6）。
const DICT_PATH = path.join(process.cwd(), "lib", "search", "dict.txt.big.gz");

let jieba: Jieba | null = null;
function getJieba(): Jieba {
  if (!jieba) jieba = Jieba.withDict(gunzipSync(readFileSync(DICT_PATH)));
  return jieba;
}

/** 是否為「有意義的檢索 token」：留中日韓字與英數詞，去純標點/空白。 */
function isMeaningful(tok: string): boolean {
  return /[㐀-鿿豈-﫿A-Za-z0-9]/.test(tok);
}

/**
 * 索引用斷詞：cutForSearch（較細粒度、重疊，提升召回），回傳以空白相接的 token 串，
 * 供 `to_tsvector('simple', …)` 使用。
 */
export function segmentForIndex(text: string): string {
  return getJieba()
    .cutForSearch(text, true)
    .filter(isMeaningful)
    .join(" ");
}

/** 查詢用斷詞：cut（標準粒度），回傳 token 陣列，供組 tsquery。 */
export function segmentForQuery(text: string): string[] {
  return getJieba().cut(text, true).filter(isMeaningful);
}
