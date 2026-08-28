/**
 * 提案附件檔名 — 把「改檔名」和「打議程」這兩件重工併成一件。
 *
 * 承辦現行流程（祕書長口述，2026-08-27）：
 *   1. 從信件下載各單位寄來的提案
 *   2. 手動改檔名成「附件2_茲提名…」
 *   3. 程序委員會審順序與通不通過
 *   4. 發議程，並把提案的主旨／緣由／提案人抄到議程上
 * 第 2 步與第 4 步是同一份「案由」打兩次。提案一旦建在系統裡，
 * 檔名就能直接產出來複製，不必再打第二次。
 *
 * 命名沿用她既有的慣例（附件序_案由），不自行發明格式。
 */

/**
 * 路徑分隔符通常隔開有意義的兩段（「115/1 預算案」），直接刪掉會黏成「1151」，
 * 故改寫成連字號；其餘不合法字元刪除即可。中文、括號、頓號、全形冒號、空白都保留。
 */
const SEPARATOR = new RegExp("[\\\\/]", "g");
const ILLEGAL = new RegExp("[:*?\"<>|\\u0000-\\u001f]", "g");

/** Windows 保留的裝置名（做為完整檔名時會失敗）。 */
const RESERVED_DEVICE = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;

/**
 * 產生單一提案的附件檔名（不含副檔名）。
 * 例：serialNo=2、title="茲提名王小明擔任財務部部長案" → 「附件2_茲提名王小明擔任財務部部長案」
 */
export function attachmentBaseName(serialNo: number, title: string): string {
  const clean = title
    .replace(SEPARATOR, "-")
    .replace(ILLEGAL, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[.\s]+$/, ""); // Windows 不接受結尾的點或空白
  const body = clean || "提案";
  const name = `附件${serialNo}_${body}`;
  // 檔名長度上限保守取 120 字元（NTFS 單段上限 255，但雲端硬碟與壓縮工具常更嚴）。
  const capped = name.length > 120 ? name.slice(0, 120) : name;
  return RESERVED_DEVICE.test(capped) ? `${capped}_` : capped;
}

export type ProposalForNaming = {
  serialNo: number;
  title: string;
  order: number;
};

/** 依議程順序產出整批檔名清單，供一次複製後照著改。 */
export function attachmentNameList(proposals: ProposalForNaming[]): string {
  return [...proposals]
    .sort((a, b) => a.order - b.order || a.serialNo - b.serialNo)
    .map((p) => attachmentBaseName(p.serialNo, p.title))
    .join("\n");
}
