/**
 * 微文案集中處（CLAUDE.md 編碼規則：不要把字串散落各處）。
 * 內容鎖定於 DESIGN-SYSTEM.md §6。字數/條數等事實以資料保真為準（38 部 / 768 條）。
 */
export const copy = {
  site: {
    title: "國立臺東大學學生會 · 法規系統",
    // SEO 用長描述（layout metadata）。
    description:
      "國立臺東大學學生會 38 部自治法規（768 條）整合查詢：法規檢索、條文參照、修正沿革。第二十屆現行版，逐條可溯源。",
  },

  // 首頁 hero
  home: {
    kicker: "NTTU Student Association · 20th",
    org: "國立臺東大學學生會",
    sys: "法規系統",
    en: "Student Association Codex",
    lede: "三十八部自治法規，整理成一部查得到、讀得懂、對照得起來的數位法典。第二十屆現行版，逐條可溯源、逐次修正有跡可循。",
    scrollcue: "SCROLL ↓ 向下捲動",
    // 統計數字（值由資料層帶入，這裡只放標籤）
    stats: {
      laws: "部法規",
      articles: "條條文",
      current: "現行版本",
      session: "第20屆",
    },
  },

  // 導覽 / 站名
  nav: {
    brand: "國立臺東大學學生會 · 法規系統",
    index: "法規總覽",
    reader: "條文閱讀",
    tools: "檢核・時程",
    login: "幹部登入",
  },

  // 搜尋框
  search: {
    label: "搜尋法規條文",
    placeholder: "搜尋法條、關鍵字或條號…",
    submit: "搜尋",
  },

  // 區塊標頭（EN eyebrow）
  section: {
    indexEn: "Index",
    readerEn: "Reader",
    toolsEn: "Tools",
  },

  // 列表 / 索引列
  list: {
    read: "閱讀 →",
    partsSuffix: "部", // 「N 部」
  },

  // 分類（zh → EN），順序見 lib/categories.ts
  categories: {
    最高章程: "Charter",
    立法: "Legislative",
    行政: "Executive",
    司法: "Judicial",
    選舉: "Election",
  },

  // 閱讀器
  reader: {
    articleCount: (n: number) => `共 ${n} 條`,
    currentBadge: "第20屆 現行",
    lastAmended: (roc: string) => `最近修正 民國 ${roc}`,
    history: (n: number) => `修正沿革（${n} 次）`,
    copyCite: "複製引用",
    permalink: "永久連結",
  },

  // 邊註標籤
  note: {
    ref: "參照",
    amd: "沿革",
    schRecurring: "時程・週期",
    schRelative: "時程・相對",
    schAbsolute: "時程・絕對",
  },

  // 合法性檢核判定
  verdict: {
    compliant: "符合",
    concerns: "有疑慮",
    nonCompliant: "不符合",
    insufficient: "資料不足",
    confidenceHigh: "信心 高",
    confidenceMid: "信心 中",
    confidenceLow: "信心 低",
  },

  // 固定免責句（人在迴路）
  disclaimer:
    "本結果僅供參考，正式效力以議會／評議會認定為準，請人工覆核。",

  // 頁尾
  foot: {
    zh: "國立臺東大學學生會 · 法規系統",
    en: "NTTU STUDENT ASSOCIATION · 2026",
  },
} as const;
