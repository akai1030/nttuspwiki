/**
 * 法定時程總覽資料層 — 讀取「全法規逐條抽取的法定時程」（data/statutory-schedule.json），
 * 依內容分類分組，供議事公開頁的總覽使用。
 * 資料保真：每筆 quote 皆為法規原文精確子字串，lawNumber/article 直取自來源 JSON（抽取時已程式化驗證）。
 */
import raw from "@/data/statutory-schedule.json";

export type StatutoryItem = {
  lawNumber: string;
  lawName: string;
  article: string;
  articleName: string;
  quote: string;
  type: "RECURRING" | "RELATIVE" | "ABSOLUTE";
  subject: string;
  summary: string;
};

const ITEMS = raw as StatutoryItem[];

export type ScheduleGroup = { key: string; title: string; en: string; items: StatutoryItem[] };

// 分類（優先序，先命中者為準）。純為導覽分組；每筆仍附法源可回溯。
function categoryOf(x: StatutoryItem): string {
  const q = x.quote + x.summary;
  const s = x.subject;
  if (x.lawNumber[0] === "4" || /選舉|罷免|公民投票|連署|候選|投票日/.test(q) || /選舉|公審/.test(s)) return "election";
  if (x.lawNumber === "3.0" || /申訴|評議|仲裁|覆議|調閱|彈劾|無效之訴|再申訴|救濟/.test(q)) return "redress";
  if (/委員會/.test(s) || /委員會.{0,12}(召開|開會|審查|審議|審理|開議)/.test(q)) return "committee";
  if (
    x.lawNumber[0] === "1" &&
    /預算|決算|經費|補助|核銷|傳票|撥款|領款|退費|會費|差旅|器材|租借|急難|資產|結餘|款項|保留|銷毀/.test(q)
  )
    return "finance";
  if (/常會|臨時會|開議|開會|議程|質詢|施政|提案|會期|預備會議|列席|旁聽|出缺席|停權|席次/.test(q)) return "meeting";
  if (/任期|交接|就職|解職|缺位|懸缺|移交|屆滿|補選|遞補|辭職|代理|任命|解除職務|報備|備查/.test(q)) return "term";
  return "other";
}

const ORDER = ["meeting", "committee", "election", "redress", "finance", "term", "other"] as const;

const TITLES: Record<string, { title: string; en: string }> = {
  meeting: { title: "會議・提案・通知期限", en: "Meetings" },
  committee: { title: "委員會召開", en: "Committees" },
  election: { title: "選舉・罷免・公投", en: "Elections" },
  redress: { title: "覆議・申訴・調閱・救濟", en: "Redress" },
  finance: { title: "財務・預算・決算・補助", en: "Finance" },
  term: { title: "任期・交接・出缺・補選", en: "Terms" },
  other: { title: "其他法定時程", en: "Other" },
};

export function scheduleGroups(): ScheduleGroup[] {
  const buckets: Record<string, StatutoryItem[]> = {};
  for (const x of ITEMS) (buckets[categoryOf(x)] ??= []).push(x);
  return ORDER.filter((k) => buckets[k]?.length).map((k) => ({
    key: k,
    title: TITLES[k].title,
    en: TITLES[k].en,
    items: buckets[k].sort((a, b) => a.lawNumber.localeCompare(b.lawNumber) || Number(a.article) - Number(b.article)),
  }));
}

export function scheduleCount(): number {
  return ITEMS.length;
}

/** 週期／固定行事曆錨點（會期、每月常會、選舉、交接等），做為總覽最上方的「年度骨幹」。 */
export function calendarBackbone(): StatutoryItem[] {
  return ITEMS.filter((x) => x.type === "RECURRING" || x.type === "ABSOLUTE");
}
