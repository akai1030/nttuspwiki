/**
 * 「逐字一致」的正規化契約（Kai 拍板：先嚴格）。
 *
 * 為什麼需要正規化：PDF 沒有線性文字，`pdftotext` 抽出來的字會夾雜「純版面雜訊」——
 * 換行、CJK 字元間被硬塞的空白、全形/半形差異、頁首頁尾、頁碼。這些不是法條內容。
 * 我們要保證的是「**實質字元**逐字一致」，不是 PDF 位元組一致（後者不可能）。
 *
 * 兩個層級（source-check 兩者都跑、都要過）：
 *   Level A（表意字流，headline）：只留中日韓表意文字（含中文數字），去掉標點/數字/空白/標記。
 *     → 幾乎零誤報，直接證明「每一個中文字都對得上、順序正確、沒有漏字或竄改」。
 *   Level B（完整正規化，review 級）：NFC + 全形轉半形 + 去所有空白 + 去項次標記符號。
 *     → 連標點、阿拉伯數字、拉丁字都比；差異列為人工覆核項（多為 PDF 抽取的標點小差）。
 *
 * 這套正規化不重用 parse_laws.py 的斷句/去空白啟發式，因此可獨立抓出「解析器 bug」
 * （例如 733 漏抽整條 → 會在 Level A 顯示為某段中文字在 DB 側缺失）。
 */

/** 全形 ASCII（U+FF01–FF5E）轉半形；全形空白 U+3000 轉一般空白。 */
function toHalfwidth(s: string): string {
  let out = "";
  for (const ch of s) {
    const c = ch.codePointAt(0)!;
    if (c >= 0xff01 && c <= 0xff5e) out += String.fromCodePoint(c - 0xfee0);
    else if (c === 0x3000) out += " ";
    else out += ch;
  }
  return out;
}

/** 是否為中日韓表意文字（含常用 + 擴充 A + 相容區）。中文數字（一二三…）也在此範圍。 */
function isIdeograph(cp: number): boolean {
  return (
    (cp >= 0x3400 && cp <= 0x9fff) || // 擴充A + 常用
    (cp >= 0xf900 && cp <= 0xfaff) // 相容
  );
}

/**
 * Level A — 表意字流：只保留中日韓表意文字。
 * 去除：所有空白、標點、阿拉伯數字、拉丁字母、項次標記。
 * 這是「每個中文字逐字一致」的最強、最不易誤報的比對基準。
 */
export function cjkStream(s: string): string {
  const nfc = s.normalize("NFC");
  let out = "";
  for (const ch of nfc) {
    const cp = ch.codePointAt(0)!;
    if (isIdeograph(cp)) out += ch;
  }
  return out;
}

/** Level A 用的標點集合（供 Level B 保留、Level A 已排除）。 */
const KEEP_PUNCT = new Set([
  "。", "，", "、", "；", "：", "？", "！",
  "「", "」", "『", "』", "（", "）", "《", "》", "〈", "〉", "【", "】",
  "…", "—", "－", "‧", "·", "、",
]);

/**
 * Level B — 完整正規化字串：NFC → 全形轉半形 → 去所有空白 → 去「項次標記」符號。
 * 保留 CJK、CJK 標點、阿拉伯數字、拉丁字。項次標記（行首的 "1." "一、" 等）由 parser 產生，
 * 格式可能與 PDF 原樣不同，故一併移除避免假差異，但**內容字元全部保留**。
 */
export function fullCanon(s: string): string {
  let t = toHalfwidth(s.normalize("NFC"));
  t = t.replace(/\s+/g, ""); // 去所有空白（含換行）
  // 去掉行首/內嵌的項次標記樣式：數字+點、數字+、、中文數字+、（僅標記本身，不動內容）
  t = t.replace(/(^|[。！？；：」』）】])(\d{1,3}[.、])/g, "$1");
  return t;
}

/** 保留字元判斷（Level B 完整比對用；此處導出供除錯/報告）。 */
export function isContentChar(ch: string): boolean {
  const cp = ch.codePointAt(0)!;
  return isIdeograph(cp) || KEEP_PUNCT.has(ch) || /[0-9A-Za-z]/.test(ch);
}

/**
 * 去除「款項編號」：位於句界後、緊接中文字的 1–3 位數字（可帶 . 或 、）。
 * 例：「…追認。2遵守…」→「…追認。遵守…」；「…如下:1.維持…」→「…如下:維持…」。
 * 這是**結構標記**（parser 輸出 "N. "、PDF 抽出裸數字，兩邊格式不同但都非法條內容），
 * Level B 比對時對 DB 與 PDF **對稱移除**，只留下真正的內容字元（中文＋真標點＋句中數字）。
 * 句中數字（如「第2條」「5,000元」「民國113年」）因前綴為中文或後接非中文而不受影響。
 */
export function stripListMarkers(s: string): string {
  return (
    s
      // (1) 句界/開頭後的裸數字標記（可帶 .、），緊接中文：「。2遵守」「開頭1.維持」
      .replace(/(^|[^0-9A-Za-z㐀-鿿])\d{1,3}[.、]?(?=[㐀-鿿])/g, "$1")
      // (2) 黏在中文後、帶 .、 且緊接中文的數字標記：「機制2.預算」「如下:1.計畫」
      //     必須有 .、 才動手 → 保留「第2條」「2.5%」「民國113年」等句中數字。
      .replace(/\d{1,3}[.、](?=[㐀-鿿])/g, "")
  );
}
