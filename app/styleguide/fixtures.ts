/**
 * /styleguide 用的樣本資料。全數取自真實種子（法規MD轉檔/法規結構化-第20屆.json），
 * 不虛構條數/名稱/日期（資料保真）。純展示，不連 DB。
 */
import type { ArticleNote } from "@/components/ArticleBlock";
import type { AmendmentItem } from "@/components/AmendmentTimeline";

export const SAMPLE_LAW = {
  number: "2.0",
  name: "國立臺東大學學生議會組織及實行準則",
  category: "立法",
  articleCount: 31,
  roc: "113.09.19",
} as const;

/** 五類各取真實樣本（number / name / count / date）。 */
export const SAMPLE_ROWS: Array<{
  number: string;
  name: string;
  meta: string;
  category: string;
}> = [
  {
    number: "0.0",
    name: "國立臺東大學學生會組織章程",
    meta: "60 條 · 修正 2024·09·19 · 母法",
    category: "最高章程",
  },
  {
    number: "2.3",
    name: "國立臺東大學學生議會暨常會職權行使法",
    meta: "60 條 · 修正 2024·09·19 · 三讀程序",
    category: "立法",
  },
  {
    number: "1.1",
    name: "國立臺東大學學生會預算法",
    meta: "55 條 · 修正 2024·09·19 · 收支平衡",
    category: "行政",
  },
];

/** 各分類的真實部數（見 data 統計：38 部）。 */
export const CATEGORY_COUNTS: Record<string, number> = {
  最高章程: 3,
  立法: 10,
  行政: 20,
  司法: 1,
  選舉: 4,
};

/** §10 會議之種類（含 items），來自 2.0 真實條文。 */
export const SAMPLE_ARTICLE_ITEMS = {
  number: "10",
  name: "會議之種類",
  items: [
    "1. 常會：每個月由議長召開一次，唯寒、暑假例外。",
    "2. 臨時會：因議案需要，由議長主動召開或經至少全體議員五分之二連署得召開之。",
  ],
  notes: [
    {
      kind: "sch",
      label: "時程・週期",
      text: "「常會每月一次」已排入行事曆；連動 §15 開議前 14 日公告。",
    },
  ] satisfies ArticleNote[],
};

/** §9 會期（單段正文 + 絕對時程邊註）。 */
export const SAMPLE_ARTICLE_BODY = {
  number: "9",
  name: "會期",
  body: "一屆任期即為完整之會期，自七月一日起至隔年六月三十日止。",
  notes: [
    {
      kind: "sch",
      label: "時程・絕對",
      text: "會期 7/1–6/30，全年時程之基準。",
    },
  ] satisfies ArticleNote[],
};

/**
 * §1 立法依據（真實條文，含真實交互參照：依《組織章程》第三十二條訂定）。
 * body 由頁面用 <Xref> 包住被引法規名組出。預覽卡 body 為 0.0 §32 逐字節錄。
 */
export const SAMPLE_ARTICLE_XREF = {
  number: "1",
  name: "立法依據",
  notes: [
    {
      kind: "ref",
      label: "參照",
      text: "《國立臺東大學學生會組織章程》§32 議會職權",
      preview: {
        title: "組織章程 · 第 32 條（議會職權）",
        body:
          "學生議會依下列規定，行使職權：1. 學生議會決議案通過後，應於七日內移送學生行政中心，學生行政中心應於收到後七日內公布之…",
      },
    },
  ] satisfies ArticleNote[],
};

/**
 * §15 會議公開原則（真實原文）。
 * 註：prototype/law-codex-v4*.html 曾在此條杜撰「並依《職權行使法》第 8 條所定程序辦理」子句，
 * 真實條文並無此句、亦不參照職權行使法——資料保真：一律以真實原文為準。
 */
export const SAMPLE_ARTICLE_15 = {
  number: "15",
  name: "會議公開原則",
  body: "學生議會會議，除各委員會另有規定者外，應公開且於開議十四日前公告後舉行。不得舉行祕密會議。",
  notes: [
    {
      kind: "amd",
      label: "沿革",
      text: "113.06.06 第十八屆六月常會修正本條。",
    },
  ] satisfies ArticleNote[],
};

/** 2.0 真實修正沿革（節錄前 5 筆，共 15 次）。 */
export const SAMPLE_AMENDMENTS: AmendmentItem[] = [
  { roc: "113.09.19", text: "第十九屆九月常會修正第 4 條" },
  { roc: "113.06.06", text: "第十八屆六月常會修正第 13、15、20、28 條" },
  { roc: "101.10.21", text: "第七屆學生議會十月常會修正第 24、26、28 條" },
  { roc: "100.11.05", text: "第六屆學生議會十一月常會修正通過全文三十三條" },
  { roc: "100.01.07", text: "第五屆學生議會第四次常會訂定通過" },
];
export const SAMPLE_AMENDMENT_COUNT = 15;
