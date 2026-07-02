/**
 * 交互參照抽取：從條文掃「《法規名》第X條」與「準用/牴觸/另訂」，產出參照邊。
 * 建參照圖（LawReference）：能對應到語料內法規就連 toLawId，語料外（如《大學法》《憲法》）toLawId=null。
 * 資料保真：只讀原文、不改寫；解析不到就標 null，不臆測。
 */

const CH: Record<string, number> = {
  零: 0, 〇: 0, 一: 1, 二: 2, 兩: 2, 三: 3, 四: 4, 五: 5,
  六: 6, 七: 7, 八: 8, 九: 9, 十: 10, 百: 100,
};

/** 中文數字（或阿拉伯）→ int；無法解析回 null。 */
export function cn2int(s: string): number | null {
  const t = s.trim();
  if (/^\d+$/.test(t)) return Number(t);
  let section = 0;
  let num = 0;
  for (const ch of t) {
    if (!(ch in CH)) return null;
    const v = CH[ch];
    if (v === 10 || v === 100) {
      section += (num || 1) * v;
      num = 0;
    } else {
      num = v;
    }
  }
  const total = section + num;
  return total > 0 ? total : null;
}

export type RefKind = "cite" | "準用" | "牴觸" | "另訂";

export interface RawRef {
  toLawName: string; // 原文《》內的法規名
  toArticleNo: string | null; // 阿拉伯字串，如 "16"；無則 null
  kind: RefKind;
  raw: string; // 原文片段
}

// 《法規名》第X條（條號可中文或阿拉伯；只取緊接的第一條）
const RE_REF = /《([^》]{2,40})》(?:\s*第\s*([一二三四五六七八九十百零〇\d]+)\s*條)?/g;

function kindNear(text: string, at: number, len: number): RefKind {
  const ctx = text.slice(Math.max(0, at - 12), at + len + 12);
  if (ctx.includes("準用")) return "準用";
  if (ctx.includes("牴觸")) return "牴觸";
  if (ctx.includes("另訂") || ctx.includes("另定")) return "另訂";
  return "cite";
}

export function extractRefs(body: string): RawRef[] {
  const out: RawRef[] = [];
  for (const m of body.matchAll(RE_REF)) {
    const name = m[1].trim();
    const artRaw = m[2];
    const artNo = artRaw ? cn2int(artRaw) : null;
    out.push({
      toLawName: name,
      toArticleNo: artNo != null ? String(artNo) : null,
      kind: kindNear(body, m.index ?? 0, m[0].length),
      raw: m[0],
    });
  }
  return out;
}

/** 常見機構前綴（解析法規名時剝除，提升短名↔全名匹配）。 */
const PREFIXES = [
  "國立臺東大學學生議會",
  "國立臺東大學學生會",
  "國立臺東大學學生",
  "國立臺東大學",
  "本會",
  "學生會",
];

export function normalizeLawName(name: string): string {
  let n = name.replace(/\s+/g, "");
  for (const p of PREFIXES) {
    if (n.startsWith(p)) {
      n = n.slice(p.length);
      break;
    }
  }
  // 去連接詞「及/暨」——法規名常見「組織及實行準則」vs 引用寫「組織實行準則」；38 部間去掉後無碰撞。
  n = n.replace(/[及暨]/g, "");
  return n;
}

/**
 * 把參照名對應到語料內 Law。laws：[{id, name}]。
 * 策略：全名精確 → 正規化精確 → 正規化互為子字串（取最長）→ 無則 null（語料外）。
 */
export function resolveLawId(
  refName: string,
  laws: { id: string; name: string }[]
): string | null {
  const exact = laws.find((l) => l.name === refName);
  if (exact) return exact.id;

  const rn = normalizeLawName(refName);
  if (!rn) return null;
  const normExact = laws.find((l) => normalizeLawName(l.name) === rn);
  if (normExact) return normExact.id;

  let best: { id: string; score: number } | null = null;
  for (const l of laws) {
    const ln = normalizeLawName(l.name);
    if (ln.includes(rn) || rn.includes(ln)) {
      const score = Math.min(ln.length, rn.length);
      if (!best || score > best.score) best = { id: l.id, score };
    }
  }
  return best?.id ?? null;
}
