/**
 * 微文案集中處（CLAUDE.md 編碼規則：不要把字串散落各處）。
 * 內容鎖定於 DESIGN-SYSTEM.md §6。字數/條數等事實以資料保真為準（38 部 / 768 條）。
 */
export const copy = {
  site: {
    title: "國立臺東大學學生議會數位法典｜法規查詢暨自治制度資料庫",
    // SEO 用長描述（layout metadata）。
    description:
      "國立臺東大學學生議會數位法典——彙整學生會 38 部自治法規、768 條條文的查詢與自治制度資料庫。法規檢索、條文參照、修正沿革，第二十屆現行版，逐條可溯源。",
  },

  // 首頁 hero
  home: {
    kicker: "NTTU Student Parliament · 20th",
    org: "國立臺東大學學生議會",
    sys: "數位法典",
    subtitle: "法規查詢暨自治制度資料庫",
    en: "NTTUSP Codex",
    lede: "三十八部自治法規，整理成一部查得到、讀得懂、對照得起來的數位法典。第二十屆現行版，逐條可溯源、逐次修正有跡可循。",
    scrollcue: { latin: "SCROLL ↓", zh: "向下捲動" },
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
    brand: "國立臺東大學學生議會 · 數位法典",
    index: "法規總覽",
    reader: "條文閱讀",
    search: "全文檢索",
    tools: "檢核・時程",
    login: "幹部登入",
  },

  // 側邊軌（首頁直排索引）
  rail: [
    { no: "00", label: "序", href: "#hero" },
    { no: "01", label: "總覽", href: "#index" },
    { no: "02", label: "檢索", href: "#search" },
    { no: "03", label: "工具", href: "#tools" },
  ],

  // 首頁分節標頭與導言
  landing: {
    browseAll: "瀏覽全部法規",
    sections: {
      index: {
        no: "01",
        title: "法規總覽",
        en: "Index",
        lede: "三十八部自治法規，分屬最高章程、立法、行政、司法、選舉五類，逐部可讀、逐條可查。",
      },
      search: {
        no: "02",
        title: "全文檢索",
        en: "Search",
        lede: "以關鍵字或語意查找條文，命中即可跳回原文對照。中文斷詞處理，離線可用。",
      },
      tools: {
        no: "03",
        title: "檢核與時程",
        en: "Tools",
        lede: "幹部專用：把提案與經費文件對照相關法規，並從法條推算法定期限、自動提醒。",
      },
    },
  },

  // 法規總覽頁
  indexPage: {
    title: "法規總覽",
    en: "Index",
    lede: "依最高章程、立法、行政、司法、選舉五類編排。點任一部進入條文閱讀。",
    articlesSuffix: "條",
    citesSuffix: "處參照",
    mother: "母法",
  },

  // 全文檢索頁
  searchPage: {
    title: "全文檢索",
    en: "Search",
    emptyPrompt: "輸入關鍵字、條號或整段文字，查找相關法條。",
    resultCount: (n: number) => `找到 ${n} 條相關條文`,
    noResults: "查無相關條文，換個關鍵字或改用語意檢索試試。",
    error: "檢索暫時無法使用，請稍後再試。",
    degraded: "語意檢索暫不可用，已改用關鍵字檢索。",
    tokensLabel: "斷詞",
    modes: {
      hybrid: "混合",
      keyword: "關鍵字",
      semantic: "語意",
    },
    modeHint: {
      hybrid: "關鍵字與語意並用（預設）",
      keyword: "精準比對詞面",
      semantic: "找意思相近的條文",
    },
  },

  // 檢核／時程 teaser（尚未開放，只描述用途，不輸出任何判定）
  toolsTeaser: {
    comingSoon: "建置中",
    check: {
      title: "合法性檢核",
      body: "把議會提案、活動企劃或經費申請貼進來，系統撈出相關法條並列出對照重點，判斷仍由人決定。",
    },
    schedule: {
      title: "時程與提醒",
      body: "從法條抽出的會議週期與法定期限，設定一個錨定日即自動推算，並在站內與行事曆提醒。",
    },
  },

  // 閱讀器補充
  readerPage: {
    breadcrumbRoot: "法規總覽",
    preambleLabel: "前言",
    backToIndex: "← 回總覽",
    tocTitle: "章條目錄",
  },

  // 幹部登入（功能於後續開放）
  login: {
    title: "幹部登入",
    body: "檢核與時程為幹部專用功能，登入機制建置中。公開的法規查詢與全文檢索無需登入即可使用。",
    backHome: "← 回首頁",
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
    zh: "國立臺東大學學生議會 · 數位法典",
    en: "NTTU STUDENT ASSOCIATION · 2026",
  },
} as const;
