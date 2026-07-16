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
    login: "議會登入",
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
        lede: "議會專用：把提案與經費文件對照相關法規，並從法條推算法定期限、自動提醒。",
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
    loadError: "法規清單暫時無法載入，請稍後再試。",
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

  // 議會登入
  login: {
    title: "議會登入",
    body: "檢核與時程為議會專用功能，需以議會帳號登入。公開的法規查詢與全文檢索無需登入即可使用。",
    backHome: "← 回首頁",
    form: {
      emailLabel: "議會信箱",
      emailPlaceholder: "you@example.com",
      passwordLabel: "密碼",
      passwordPlaceholder: "輸入密碼",
      submit: "登入",
      submitting: "登入中…",
      // 錯誤訊息刻意不區分「帳號不存在」與「密碼錯誤」，避免洩漏白名單
      errorMissing: "請輸入信箱與密碼。",
      errorInvalid: "信箱或密碼不正確。",
      errorServer: "登入服務暫時無法使用，請稍後再試。",
      errorNetwork: "連線失敗，請檢查網路後再試。",
      noAccount: "尚無帳號？議會帳號由管理員建立，請洽議會祕書處。",
    },
  },

  // 議會中控台
  console: {
    eyebrow: "Officer Console",
    title: "議會中控台",
    greeting: (name: string) => `${name}，你好`,
    roleLabel: "權限",
    roles: {
      admin: "管理員",
      officer: "議會",
      viewer: "檢視者",
    },
    logout: "登出",
    denied: "你沒有存取該頁的權限。",
    lede: "議會專用工具入口。此處資料不對外公開。",
    tools: {
      meetings: {
        title: "會議營運",
        body: "建立會議、彙整提案、生成議程與開會通知（套官方公版），並在會前提醒。開會通知採站內生成、人工貼到官方信箱寄出。",
        status: "開放",
        href: "/console/meetings",
      },
      check: {
        title: "合法性檢核",
        body: "把議會提案、活動企劃或經費申請貼進來，系統撈出相關法條並列出對照重點，判斷仍由人決定。",
        status: "建置中",
        href: null,
      },
    },
  },

  // 成員管理（僅 admin）
  members: {
    nav: "成員管理",
    title: "成員管理",
    lede: "建立與管理議會登入帳號。祕書處人員給「議會」即可操作會議營運；「管理員」另可管理成員。",
    backToConsole: "← 回中控台",
    roleNames: { admin: "管理員", officer: "議會", viewer: "檢視" },
    add: {
      title: "新增成員",
      email: "Email",
      name: "姓名",
      role: "角色",
      password: "初始密碼",
      hint: "初始密碼至少 8 碼，建立後把 Email 與密碼交給該成員；忘記可由管理員重設。",
      submit: "建立帳號",
      okPrefix: "已建立",
      okSuffix: "。把 Email 與初始密碼交給該成員即可登入。",
      errInput: "Email 與初始密碼（至少 8 碼）為必填。",
      errDup: "此 Email 已有帳號。",
    },
    list: {
      email: "Email",
      name: "姓名",
      role: "角色",
      lastLogin: "最後登入",
      never: "尚未登入",
      noPassword: "未設密碼",
      empty: "尚無成員。",
      you: "你自己",
      resetLabel: "重設密碼",
      resetPlaceholder: "新密碼（≥8碼）",
      reset: "重設",
      roleChange: "變更",
      del: "刪除",
    },
  },

  // 會議營運模組
  meetings: {
    nav: "會議營運",
    title: "會議營運",
    lede: "建立會議、彙整提案、生成議程與開會通知，並管理會前提醒。所有資料僅議會可見。",
    backToConsole: "← 回中控台",
    copy: "複製",
    copied: "已複製",
    list: {
      newMeeting: "建立會議",
      recipients: "收件人名單",
      empty: "尚無會議。點「建立會議」開始。",
      colName: "會議",
      colWhen: "會議時間",
      colStatus: "狀態",
      proposalsN: (n: number) => `${n} 提案`,
      open: "進入 →",
    },
    kind: { REGULAR: "常會", SPECIAL: "臨時會", COMMITTEE: "委員會" },
    status: { DRAFT: "建置中", NOTICED: "已發通知", HELD: "已召開", CLOSED: "已結案" },
    form: {
      createTitle: "建立會議",
      session: "屆別",
      academicYear: "學年度學期",
      academicYearPlaceholder: "114學年度第2學期",
      name: "會議名稱",
      namePlaceholder: "七月議會臨時會",
      kind: "會議類別",
      meetingAt: "會議時間",
      location: "地點",
      locationPlaceholder: "線上視訊會議室",
      meetingUrl: "會議連結",
      meetingUrlPlaceholder: "https://meet.google.com/…",
      docNumber: "東議字號",
      docNumberPlaceholder: "東議字第1140246號",
      proposalDeadline: "提案截止時間",
      notes: "備註",
      notesPlaceholder: "二、…（一為提案截止，系統自動帶入）",
      submit: "建立",
      required: "屆別、學年度學期、會議名稱、會議時間為必填。",
    },
    detail: {
      infoTitle: "會議資訊",
      edit: "編輯",
      proposalsTitle: "提案",
      agendaTitle: "議程（附件1）",
      agendaGenerate: "依提案生成議程",
      agendaHint: "分節依《會議規範》，可於複製後自行調整。",
      noticeTitle: "開會通知 / 會議通知",
      remindersTitle: "會前提醒",
      filesTitle: "會議資料",
    },
    proposal: {
      addTitle: "新增提案",
      serialNo: "案號 / 附件序",
      section: "分節",
      title: "案由",
      titlePlaceholder: "案由…",
      proposer: "提案人",
      explanation: "說明",
      fileUrl: "附件連結",
      fileUrlPlaceholder: "雲端硬碟或檔案 URL（R2 上傳待設定）",
      add: "新增提案",
      empty: "尚無提案。",
      delete: "刪除",
    },
    timeline: {
      title: "籌備時間軸",
      lede: "從會議日期往回推的籌備里程碑。點各事項的按鈕即可生成對應郵件或加提醒。",
      offsetNote: "天數為常用預設、非法定精確值；實際期限以《組織章程》《議事規則》為準，待確認後對齊法源。",
      today: "今天",
      inDays: (n: number) => `還有 ${n} 天`,
      agoDays: (n: number) => `已過 ${n} 天`,
      actNotice: "生成開會通知",
      actAgenda: "生成議程通知",
      actRemind: "加入提醒",
      done: "已加提醒",
    },
    notice: {
      audience: "稱謂",
      audiencePlaceholder: "議員代表 / 議員 / 列席代表",
      kindNotice: "開會通知單",
      kindAgenda: "會議通知（含議程）",
      pick: "選擇通知類型、稱謂與收件人，生成內容後複製、貼到官方信箱寄出。",
      recipients: "收件人（勾選）",
      noRecipients: "尚無收件人。先到「收件人名單」新增（可先佔位，之後補真實名單）。",
      generate: "生成通知內容",
      subject: "主旨",
      body: "內文",
      copySubject: "複製主旨",
      copyBody: "複製內文",
      copyRecipients: "複製收件人",
      latest: "最近生成",
      none: "尚未生成任何通知。",
      draftOnly: "系統只生成內容、不自動寄送；請人工於官方信箱確認後送出。",
    },
    reminder: {
      offsetDays: "會前天數",
      add: "新增提醒",
      empty: "尚無提醒。",
      fireAt: "提醒時間",
      channel: "管道",
      inapp: "站內",
      done: "已處理",
      markDone: "標記已處理",
      needMeetingTime: "需先有會議時間。",
    },
    files: {
      hint: "各提案的附件連結集中於此，方便打包／逐一開啟。",
      empty: "尚無附件連結。於提案填入「附件連結」即會列在此。",
      copyAll: "複製全部連結",
      noLink: "（未附連結）",
    },
    recipients: {
      title: "收件人名單",
      lede: "開會通知的收件對象（議員／列席／旁聽）。屬個資、僅議會可見。可先佔位，之後補真實名單。",
      addTitle: "新增收件人",
      name: "姓名",
      email: "Email",
      roleTag: "身分",
      session: "屆別",
      add: "新增",
      empty: "尚無收件人。",
      active: "啟用中",
      inactive: "已停用",
      toggle: "啟用／停用",
      placeholderNote: "提示：可先新增幾筆佔位（如「議員01」），之後再改成真實姓名與信箱。",
    },
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
