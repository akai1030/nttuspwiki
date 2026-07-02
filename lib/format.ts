/**
 * 顯示層格式工具（純函式、無 DB）。日期/編號的呈現規則集中在此一處，
 * 避免頁面各自硬幹格式（一致性 + 好測）。資料保真：只格式化、不改值。
 */

/** 西元日期 → `2024·09·19`（索引 meta 用；DESIGN-SYSTEM 原型的點分格式）。用 UTC 避免時區把 9/19 位移成 9/18。 */
export function formatCE(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}·${m}·${day}`;
}

/** 西元日期 → 民國 `113.09.19`（閱讀器 subbar 用）。沿革本身帶 roc 字串時優先用沿革的。 */
export function formatROC(d: Date): string {
  const y = d.getUTCFullYear() - 1911;
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}.${m}.${day}`;
}

/**
 * 法規號/條號的自然排序：`1.10` 要排在 `1.1` 之後、`3-1` 排在 `3` 之後、`10` 排在 `2` 之後。
 * 以 `.` 或 `-` 切段逐段比數值；較短者（如 `3` vs `3-1`）視為前綴，排前面。
 */
export function compareNumbering(a: string, b: string): number {
  const pa = a.split(/[.\-]/).map((s) => parseInt(s, 10));
  const pb = b.split(/[.\-]/).map((s) => parseInt(s, 10));
  const n = Math.max(pa.length, pb.length);
  for (let i = 0; i < n; i++) {
    const x = Number.isNaN(pa[i]) ? -1 : pa[i] ?? -1;
    const y = Number.isNaN(pb[i]) ? -1 : pb[i] ?? -1;
    if (x !== y) return x - y;
  }
  return 0;
}

/** 分類 anchor slug（`/law#cat-legislative`）。用 EN 小寫，避免 CJK 進 URL fragment。 */
export function categorySlug(en: string): string {
  return `cat-${en.toLowerCase()}`;
}

/**
 * 取章號「第X章」。chapters[].title 可能字元間夾空白（PDF 抽取所致，如「第 一 章 總 則」，
 * 甚至「第」「一」「章」之間都有空格），故先去全部空白再抽章號，才能與 article.chapter（無空白「第一章」）對上。
 */
export function chapterPrefix(title: string): string {
  const compact = title.replace(/\s+/g, "");
  const m = compact.match(/^第[一二三四五六七八九十百零〇\d]+章/);
  return m ? m[0] : compact;
}

/** 截斷長文供預覽卡（不改原字、只截）。 */
export function clip(text: string, n: number): string {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length > n ? t.slice(0, n) + "…" : t;
}

/** 剝除機構前綴取法規短名（純顯示，不影響資料）：參照邊註 / 預覽卡標題用。 */
export function shortLawName(name: string): string {
  return (
    name
      .replace(/^國立臺東大學學生議會/, "")
      .replace(/^國立臺東大學學生會/, "")
      .replace(/^國立臺東大學/, "") || name
  );
}
