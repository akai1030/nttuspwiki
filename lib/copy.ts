/**
 * 微文案集中處（CLAUDE.md 編碼規則：不要把字串散落各處）。
 * 內容鎖定於 DESIGN-SYSTEM.md §6。字數/條數等事實以資料保真為準（38 部 / 772 條）。
 */
export const copy = {
  site: {
    title: "國立臺東大學學生議會數位法典暨議事系統｜法規查詢、自治制度資料庫",
    // SEO 用長描述（layout metadata）。
    description:
      "國立臺東大學學生議會數位法典暨議事系統——彙整學生會 38 部自治法規、772 條條文的查詢與自治制度資料庫。法規檢索、條文參照、修正沿革，第二十屆現行版，逐條可溯源。",
  },

  // 首頁 hero
  home: {
    kicker: "NTTU Student Parliament · 20th",
    org: "國立臺東大學學生議會",
    sys: "數位法典暨議事系統",
    subtitle: "法規查詢、自治制度資料庫",
    en: "NTTUSP Codex",
    lede: "三十八部自治法規，整理成一部查得到、讀得懂的數位法典。第二十屆現行版，逐條可溯源、逐次修正有跡可循。",
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
    brand: "國立臺東大學學生議會 · 數位法典暨議事系統",
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
      errorTooMany: "嘗試次數過多，請 15 分鐘後再試。",
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
      voteGuide: {
        title: "線上表決操作說明",
        body: "開會通知怎麼附投票網址、開會當天從開啟現場議事到截止投票的每一步、議員登不進去時怎麼處理。",
        status: "說明",
        href: "/console/meetings/guide",
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

  // 免登入公開頁：議事公開
  publicMeetings: {
    nav: "議事公開",
    title: "議事公開",
    lede: "學生議會會議資訊公開：會議時間、議程與籌備時程，供全校查閱。收件人名單等個人資料不對外公開。",
    aboutLink: "議事制度說明",
    empty: "目前尚無公開會議。",
    colWhen: "會議時間",
    upcoming: "即將召開",
    past: "已召開",
    detail: {
      resolution: "決議",
      infoTitle: "會議資訊",
      agendaTitle: "議程",
      timelineTitle: "籌備時程",
      when: "會議時間",
      place: "會議地點",
      link: "會議連結",
      doc: "文號",
      deadline: "提案截止",
      noProposals: "議程尚未確定或本次無提案。",
      back: "← 議事公開",
      disclaimer: "本頁資料由學生議會祕書處維護，僅供參考；正式效力以議會通過之會議紀錄為準。",
    },
    schedule: {
      nav: "法定時程總覽",
      title: "法定時程總覽",
      lede: "依全部 38 部自治法規逐條整理的法定時程——會議週期、提案與通知期限、委員會召開、選舉罷免、覆議申訴、財務、任期交接。每筆附法源，可點回原文對照。",
      count: (n: number) => `共 ${n} 條法定時程`,
      backboneTitle: "年度骨幹",
      backboneLede: "週期與固定行事曆錨點（會期、每月常會、選舉、交接等）。",
      source: "法源",
      back: "← 議事公開",
      disclaimer: "本總覽由程式逐條抽取、逐筆比對原文；分類僅為便於瀏覽，實際適用以法規原文與議會認定為準。",
      cardTitle: "法定時程總覽",
      cardBody: "把所有法規裡的時程規定（會議、委員會、選舉、寄送期限…）整理成一頁，附法源可回溯。",
    },
    about: {
      title: "議事制度說明",
      lede: "說明學生議會的會議如何運作、各會議類型與籌備流程的意義。",
      back: "← 議事公開",
      sections: [
        {
          h: "這個頁面是什麼",
          items: [
            "這裡公開國立臺東大學學生議會的會議資訊——會議時間、議程與籌備時程，供全校查閱。",
          ],
        },
        {
          h: "會議類型",
          items: [
            "常會：定期召開的例行會議。",
            "臨時會：因特定事由臨時召集的會議。",
            "委員會：如財務委員會等，就特定事務分工審議。",
          ],
        },
        {
          h: "籌備流程各步驟的意思",
          items: [
            "寄送開會通知：會議前依規定日數，將開會通知函送議員與列席人員。",
            "提案繳交截止：議員須於此時間前提交提案。",
            "函送會議議程：彙整提案成議程（附件1）連同相關資料寄出。",
            "會前提醒：會議前提醒議員撥冗與會，避免不足額而流會。",
            "會議召開：須達應到人數（二分之一以上代表出席）方得開議。",
          ],
        },
        {
          h: "旁聽",
          items: [
            "任何人得依《國立臺東大學學生議會會議列席暨旁聽規則》旁聽會議。",
            "線上會議請以本名加入、並遵守會議秩序與主席指示。",
          ],
        },
        {
          h: "資料來源與免責",
          items: [
            "本頁資料由學生議會祕書處維護，僅供參考。",
            "正式效力以議會通過之會議紀錄為準。",
          ],
        },
      ],
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
    copiedRich: "已複製（含格式）",
    copyFailed: "複製失敗，改按純文字",
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
    // 現場議事（開會系統）。祕書／議長的控制台與與會人的看板是同一份資料。
    live: {
      nav: "現場議事",
      title: "現場議事",
      consoleTitle: "現場議事控制台",
      lead:
        "開會當下用。主席宣告進到哪一案、點名結果幾人，按下去與會人的畫面才會跟著變 —— " +
        "系統不以時鐘推算議程，也沒有倒數計時。",
      open: "開啟現場議事",
      close: "關閉現場議事",
      openState: "現場議事已開啟",
      closedState: "現場議事未開啟",
      closedHint: "開啟後，與會人憑下方連結即可看到議程進度（不需登入）。關閉後連結立即失效。",
      shareLink: "與會人連結",
      copyLink: "複製連結",
      current: "現在討論",
      currentNone: "目前無進行中的議案（尚未開始、休息中，或正在處理程序事項）。",
      setCurrent: "宣告進入本案",
      clearCurrent: "結束本案（回到無進行中議案）",
      agenda: "議程進度",
      done: "已有決議",
      attendance: "點名結果",
      attendanceNone: "尚未登記出席人數。",
      rollCallHint: "勾選出席議員後按「登記」。出席人數等於勾選人數；線上表決只有勾選的人能投。",
      saveAttendance: "登記",
      totalBasis: "議員總額採用之定義",
      totalBasisLabel: {
        "2.3-4-2": "《議會暨常會職權行使法》§4② 實際報到人數，減除辭職／去職／亡故者",
        "2.0-13-1": "《議會組織及實行準則》§13①② 扣除請假及離職者之實際在任人數",
      } as Record<string, string>,
      totalBasisNone: "未指定",
      totalBasisHint:
        "兩部法規對「議員總額」的定義不同，會算出不同的開議與表決分母。系統不代為擇一，" +
        "請依主席或議會決議選定並逐次記錄。",
      note: "主席公告",
      notePlaceholder: "如：休息十分鐘、本案暫緩討論",
      saveNote: "公告",
      noRule: "本案未指定議案類型，故不顯示法定表決方式。可於中控台的提案列補選。",
      lastUpdated: "最後操作",
      notOpen: "本場會議目前未開啟現場議事。",
      notOpenHint: "會議進行中由祕書處開啟；若你正在與會而看到這頁，請通知祕書處。",
    },
    // 法定表決方式提示。法規全庫查無「匿名」一詞，一律寫「無記名／記名」。
    voteRule: {
      heading: "本分節相關的法定表決方式",
      intro: "以下為本會自治法規對這個分節可能涉及之議案的規定，供承辦擬案時參考。",
      method: "表決方式",
      threshold: "可決門檻",
      unspecified: "法未規定",
      conflict: "條文措辭衝突",
      present: "出席人數",
      totalMembers: "議員總額",
      tallyHint: "會中點名後填入即可換算（整數運算，不四捨五入）。",
      tallyLater: "可決門檻的票數換算在下方各提案的決議區 —— 出席人數要到會中點名後才知道。",
      totalMembersConflict:
        "※「議員總額」的定義本身有衝突：2.3 §4② 為「實際報到人數，減除辭職／去職／亡故者」，" +
        "2.0 §13①② 為「扣除請假及離職者之實際在任人數」。兩者會算出不同分母，系統不代為擇一。",
      need: "需要 ",
      votesOf: (base: string, n: number) => ` 票（${base} ${n} 人）`,
      needInput: (base: string) => `填入${base}即可換算`,
      cannotCompute: "無法換算",
      none: "本分節在 38 部法規中查無表決方式之特別規定，適用一般表決規定。",
      disclaimer:
        "系統只列出規定，不判斷本案屬於哪一類議案、不認定通過與否；線上表決只負責計票。" +
        "議案歸類與表決結果之宣告，由承辦與主席依法為之。",
    },
    // 線上表決。法規用「記名／無記名」，不寫「匿名」。
    vote: {
      sectionTitle: "線上表決",
      lead: "開始投票後，出席議員到「議員投票」頁（/vote）登入投票。投票中任何人都看不到票數，截止後才公布。",
      chairDeclares: "系統只計票；通過與否、當選與否由主席宣布。",
      kind: "類型",
      kindMotion: "表決（同意／不同意）",
      kindElection: "選舉（選人）",
      method: "投票方式",
      secret: "無記名投票",
      named: "記名投票",
      lawFixed: (cite: string, method: string) => `依${cite}，本案以${method}為之。`,
      lawUnspecified: "法未指定表決方式，請主席選定。",
      title: "表決事項",
      candidates: "候選人（一行一位）",
      seats: "應選名額",
      seatsOf: (n: number) => `應選 ${n} 名`,
      eligibleNote: (n: number) => `可投票者：點名勾選出席的 ${n} 位議員（開始投票當下的名單）。`,
      open: "開始投票",
      close: "截止投票",
      void: "作廢",
      voidHint: "作廢後票數只留在後台備查，看板與公開頁不顯示；可以重新開一次。",
      status: { open: "投票中", closed: "已截止", voided: "已作廢" } as Record<string, string>,
      progress: (cast: number, eligible: number) => `已投 ${cast}／${eligible} 人`,
      pending: "還沒投",
      hiddenWhileOpen: "投票中不顯示票數，截止後公布。",
      notVoted: "未投票（廢票）",
      votes: (n: number) => `${n} 票`,
      people: (n: number) => `${n} 人`,
      present: "出席",
      applyResolution: "把結果帶入決議欄",
      consistencyBad: "票數核對不符：各選項合計不等於投票人數。請截圖並通知系統管理者。",
      needRollCall: "先在上方「點名結果」勾選出席議員，才能開始投票。",
      needLive: "要先開啟現場議事，議員才能投票。",
      history: "本場表決紀錄",
      none: "本場還沒有表決。",
      namedList: "記名投票明細",
      errors: {
        notLive: "現場議事未開啟，議員無法投票。請先開啟現場議事。",
        noRollCall: "還沒點名。請先在「點名結果」勾選出席議員並按「登記」。",
        alreadyOpen: "已有一個表決正在進行，請先截止或作廢。",
        noTitle: "請填表決事項。",
        badProposal: "找不到這個議案，請重新整理頁面。",
        noMethod: "法未指定表決方式，請選擇記名或無記名。",
        badCandidates: "候選人名單有誤：請一行填一位，最多 20 位，每位 40 字以內。",
      } as Record<string, string>,
      // 議員投票頁（/v/…）
      member: {
        title: "議員投票",
        hello: (name: string) => `${name} 議員您好`,
        doNotShare: "這條連結代表您本人，請勿轉傳。",
        invalid: "這條投票連結無效或已作廢，請向祕書處索取新的連結。",
        noMeeting: "目前沒有進行中的會議。會議開始、祕書處開啟現場議事後，這裡會顯示表決。",
        waiting: "目前沒有進行中的表決。表決開始後，選項會自動出現在這裡。",
        notEligible: "您不在這次表決的出席名單中（開始投票時點名未列出席）。如有疑問請告知祕書處。",
        voted: "您已完成投票。",
        votedSecret: "本次為無記名投票，系統不記錄您投了哪一項。",
        votedNamed: (label: string) => `本次為記名投票，您投的是「${label}」。`,
        pick: "請選擇一項",
        confirm: (label: string) => `確定投「${label}」？送出後不能更改。`,
        submit: "確認送出",
        back: "重新選擇",
        sending: "送出中…",
        abstainNote: "不想表態可以不投，出席但未投票視為廢票。",
        lastResult: "上一次表決結果",
        liveBoard: "看現場議程 ↗",
        errors: {
          invalid: "這條投票連結無效或已作廢，請向祕書處索取新的連結。",
          closed: "投票已截止。",
          notEligible: "您不在這次表決的出席名單中。",
          already: "您已經投過了。",
          badOption: "選項有誤，請重新整理後再試。",
          network: "送出失敗，請再按一次。",
        } as Record<string, string>,
      },
      // 收件人名單頁的投票連結
      roster: {
        heading: "議員投票連結（備用）",
        lede:
          "議員平常用開會通知裡的線上表決網址，以學號及手機末四碼登入。名冊沒有手機、或登入有困難的議員，改寄這裡的專屬連結（不用登入，整屆有效）。" +
          "按「寄給本人」會開好 Gmail 撰寫視窗（收件人、主旨、連結都已填好），請用祕書處信箱確認後送出。",
        link: "投票連結",
        copyLink: "複製連結",
        mail: "寄給本人",
        reissue: "作廢重發",
        reissueHint: "連結外流時按「作廢重發」：舊連結立即失效，再寄一次新的給本人。",
        loginFields: "登入用",
        updateLogin: "更新",
        studentIdTaken: "這個學號在本屆已有另一位議員使用。",
      },
      noticeHint: "勾選「附上線上表決網址」，通知裡會多一行投票網址，議員以學號及手機末四碼登入。名冊沒有手機的議員，請到收件人名單寄專屬連結給他。",
      noticeVoteUrl: "附上線上表決網址（議員以學號及手機末四碼登入）",
      boardVoteLink: "議員請到這裡投票 ↗",
      guideLink: "線上表決操作說明 ↗",
      // 現場議事控制台最上方的流程檢查
      flow: {
        title: "開會流程",
        live: ["現場議事已開啟", "現場議事未開啟：議員登入後只會看到「目前沒有進行中的會議」"],
        rollCall: (n: number) => `點名：已勾 ${n} 位出席議員`,
        rollCallNone: "點名：還沒勾選出席議員（沒點名不能開始投票）",
        rollCallCount: (n: number) => `點名：出席 ${n} 人（本屆沒有議員名冊，無法線上表決）`,
        current: (t: string) => `現在討論：${t}`,
        currentNone: "現在討論：還沒宣告進入任何一案",
        voteOpen: (cast: number, all: number) => `線上表決：投票中，已投 ${cast}／${all} 人`,
        voteIdle: "線上表決：目前沒有進行中的表決",
      },
      // 會議詳情頁的會前檢查
      prep: {
        title: "線上表決會前檢查",
        noticeOk: "最近一份開會通知有附線上表決網址。",
        noticeMissing: "最近一份開會通知沒有附線上表決網址：重新生成時勾選「附上線上表決網址」。",
        noticeNone: "還沒生成開會通知。生成時「附上線上表決網址」預設會勾。",
        noPhone: (names: string) => `名冊缺學號或手機、不能用學號登入的議員：${names}。請到收件人名單補上，或按「寄給本人」寄專屬連結。`,
        allPhone: (n: number) => `本屆 ${n} 位議員名冊都有學號與手機，都能用學號登入。`,
        noMembers: "本屆沒有議員名冊，無法線上表決。請先到收件人名單匯入或新增議員（身分選「議員」）。",
      },
      // /console/meetings/guide
      guide: {
        title: "線上表決操作說明",
        lede: "給祕書處與議長。照順序做；每一步要到後台哪裡按，都寫在下面。",
        sections: [
          {
            heading: "會前：發開會通知時",
            steps: [
              "生成開會通知時，確認「附上線上表決網址」有勾（預設會勾）。通知的〔會議重要資訊〕會多一行「線上表決：…/vote（以學號及手機末四碼登入）」。",
              "看會議頁的「線上表決會前檢查」：名冊沒有手機的議員不能用學號登入。到收件人名單補上手機，或按他那一列的「寄給本人」寄專屬連結（不用登入，整屆有效）。",
              "議員換了手機或學號登錯，到收件人名單改他那一列的學號、手機，按「更新」。",
            ],
          },
          {
            heading: "開會當天",
            steps: [
              "開會前到會議頁的「現場議事」，按「開啟現場議事」。沒開的話，議員登入後只會看到「目前沒有進行中的會議」。",
              "點名：勾選出席議員，按「登記」。只有勾到的人能投票。遲到的議員補勾後再按「登記」，下一次表決才有他；已經開始的表決名單不會變。",
              "主席宣告進入某案：在「議程進度」按「宣告進入本案」。",
              "要表決時，在「線上表決」按「開始投票」。同意權、覆議、彈劾、正副議長與委員會主委選舉的投票方式依法自動鎖定；其他議案由主席選記名或無記名。選人的話，類型選「選舉」，候選人一行一位。",
              "請議員打開開會通知裡的網址（現場看板上也有「議員請到這裡投票」），用學號及手機末四碼登入後投票。",
              "看「已投幾人」和「還沒投」的名單，大家投完後按「截止投票」。投票中任何人都看不到票數。",
              "截止後公布票數。按「把結果帶入決議欄」，由主席補上通過或不通過，再按「儲存決議」。",
              "開錯了（方式選錯、點名漏人、案子不對）：按「作廢」再重開。作廢的表決不會出現在看板和議事公開頁。",
              "散會後按「關閉現場議事」。",
            ],
          },
          {
            heading: "議員遇到問題",
            steps: [
              "「學號或手機末四碼不正確」：到收件人名單核對他的學號與手機。同一個學號錯 8 次會擋 15 分鐘；急的話直接寄專屬連結給他。",
              "「名冊裡沒有您的手機資料」：到收件人名單補手機，或寄專屬連結。",
              "「不在這次表決的出席名單中」：開始投票時點名沒勾到他。這次表決的名單不能改；要讓他投，只能作廢、補勾點名後重開。",
              "還沒投卻顯示「已投過」：可能有人冒名。先作廢重投，再到收件人名單對他按「作廢重發」，他原本登入的裝置會被登出。",
            ],
          },
          {
            heading: "公開範圍",
            steps: [
              "記名投票：每位議員投了什麼，會列在現場看板與議事公開頁（只列姓名，不列學號、手機）。",
              "無記名投票：只公開票數。系統不記錄誰投了哪一項，祕書處也查不到。",
              "投票中只顯示「已投幾人」；祕書處另外看得到還有誰沒投。",
            ],
          },
        ],
        adminNote: "給系統管理者：更換網站金鑰（AUTH_SECRET）後，所有專屬連結與議員登入狀態都會失效，專屬連結要重寄。",
      },
      // 共用投票頁（/vote）
      lobby: {
        lead: "請用學號及手機末四碼登入。登入後，表決開始時選項會自動出現在這裡。",
        studentId: "學號",
        phone4: "手機末四碼",
        submit: "登入",
        logout: "不是您？登出",
        errors: {
          missing: "請填學號與手機末四碼（4 位數字）。",
          invalid: "學號或手機末四碼不正確。",
          noPhone: "名冊裡沒有您的手機資料，請向祕書處索取專屬投票連結。",
          tooMany: "嘗試次數過多，請 15 分鐘後再試，或向祕書處索取專屬投票連結。",
        },
      },
    },
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
      save: "儲存變更",
      required: "屆別、學年度學期、會議名稱、會議時間為必填。",
      slug: "網址",
      slugHint: "小寫英數與連字號。留空維持原網址。改網址後舊網址會自動轉址，不會失效。",
      slugInvalid: "網址格式不正確（限小寫英數與連字號，2–64 字，且不得為保留字）。",
      slugTaken: "這個網址已被其他會議使用。",
    },
    detail: {
      infoTitle: "會議資訊",
      edit: "編輯",
      makePublic: "設為公開",
      makePrivate: "取消公開",
      publicBadge: "已公開",
      viewPublic: "查看公開頁 ↗",
      publicHint: "公開後，任何人免登入即可在「議事公開」看到本會議的時間、議程與籌備時程（不含收件人與草稿）。",
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
      serialNo: "附件序（議程＝附件1，提案從2起）",
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
      matterType: "議案類型",
      matterTypeNone: "未指定（不套用法定表決方式）",
      matterTypeHint: "選定議案類型後，會顯示該類議案的法定表決方式、可決門檻與法源原文。",
      liveHint:
        "會議進行中請用「現場議事」那頁：宣告進入某案、記決議、看所需票數都在同一畫面，" +
        "而且出席人數登記一次即全場沿用。這裡的決議欄留給會後補填。",
      matterTypeUnset: "未指定議案類型 —— 在下方「程委審核」列選定後，會中即可換算所需票數。",
      resolution: "決議",
      resolutionPlaceholder: "如：照案通過。／修正後通過，修正為…",
      resolutionSave: "儲存決議",
      resolutionEmpty: "尚未填寫",
      review: "程委審核",
      reviewPending: "待審",
      reviewPassed: "通過",
      reviewRejected: "不列入議程",
      reviewSave: "儲存",
      order: "議程順序",
      reviewHint:
        "程序委員會審定的順序與結果。標為「不列入議程」的提案不會出現在議程文字上；" +
        "「待審」照常列入。法源：《國立臺東大學學生議會暨常會職權行使法》第 9 條第 2 款" +
        "「行政中心或學生議員提出之議案，應先送程序委員會」。",
      fileName: "附件檔名",
      copyFileName: "複製檔名",
      copyAllFileNames: "複製全部檔名",
      fileNameHint:
        "照你現行的「附件序_案由」慣例產生，複製後直接貼去改檔名，案由不用再打第二次。",
      resolutionHint:
        "會後補填。決議會帶進議程文字，並在會議設為公開後顯示於議事公開頁。" +
        "《國立臺東大學學生會組織章程》第 27 條第 3 款：會長應於收到議會決議案七日內公告，" +
        "未公告亦未移請覆議者，由學生議會祕書處公告，公告後決議案即生效。",
    },
    timeline: {
      title: "籌備時間軸",
      lede: "從會議日期往回推的籌備里程碑。點各事項的按鈕即可生成對應郵件或加提醒。",
      offsetNote: "天數為常用預設、非法定精確值；實際期限以《組織章程》《議事規則》為準，待確認後對齊法源。",
      today: "今天",
      inDays: (n: number) => `還有 ${n} 天`,
      agoDays: (n: number) => `已過 ${n} 天`,
      actNotice: "去生成開會通知 ↓",
      actAgenda: "去生成議程通知 ↓",
      actRemind: "加入提醒",
      done: "已加提醒",
      addTitle: "新增委員會／其他時程",
      mTitle: "名稱",
      mTitlePlaceholder: "財務委員會",
      mAt: "時間",
      mNote: "說明（選填）",
      mAdd: "新增時程",
      del: "刪除",
    },
    notice: {
      audience: "稱謂",
      audiencePlaceholder: "議員代表 / 議員 / 列席代表",
      signer: "署名",
      signerPlaceholder: "祕書處 祕書長 王小明",
      contactPhone: "聯絡電話",
      contactEmail: "聯絡信箱",
      pdf: "PDF／列印",
      kindNotice: "開會通知單",
      kindAgenda: "會議通知（含議程）",
      pick: "選擇通知類型、稱謂與收件人，生成內容後複製、貼到官方信箱寄出。",
      recipients: "收件人（勾選）",
      manageRecipients: "管理收件人名單 ↗",
      noRecipients: "尚無收件人。先到「收件人名單」新增（可先佔位，之後補真實名單）。",
      generate: "生成通知內容",
      subject: "主旨",
      body: "內文",
      copySubject: "複製主旨",
      copyBody: "複製內文",
      copyRecipients: "複製收件人",
      copyRecipientsPlain: "複製收件人（僅信箱）",
      copyBodyPlain: "複製內文（純文字）",
      previewRich: "格式預覽",
      richHint:
        "「複製內文」會連同格式一起複製（日期紅字粗體、附件綠字底線、〔…〕螢光底），" +
        "貼進 Gmail 撰寫視窗即為下方預覽的樣子。若瀏覽器不支援，請改按「複製內文（純文字）」。",
      openInGmail: "在 Gmail 開啟草稿",
      openInGmailHint:
        "會在瀏覽器開啟 Gmail 撰寫視窗並帶入密件副本與主旨（網站不會碰到你的信箱，也不會代寄）。" +
        "若同時登入多個帳號，請先確認開出來的是官方信箱那個。",
      subjectPrefix: "主旨前綴",
      subjectPrefixPlaceholder: "檔案更正",
      subjectPrefixHint: "補寄更正版時用；留空即為一般主旨。",
      recipientsSent: "收件人",
      recipientsMissing: (n: number) => `${n} 筆已從名冊移除`,
      latest: "最近生成",
      none: "尚未生成任何通知。",
      del: "刪除",
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
      undo: "取消",
      del: "刪除",
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
      lede: "開會通知的收件對象（議員／列席／旁聽）。屬個資、僅議會可見。議員名冊由當屆選舉結果匯入，其餘身分可在此新增。",
      addTitle: "新增收件人",
      name: "姓名",
      email: "Email",
      roleTag: "身分",
      session: "屆別",
      district: "選區",
      department: "科系",
      grade: "年級",
      studentId: "學號",
      phone: "手機",
      add: "新增",
      empty: "尚無收件人。",
      active: "啟用中",
      inactive: "已停用",
      toggle: "啟用／停用",
      state: "狀態",
      save: "儲存",
      del: "刪除",
      memberN: (n: number) => `第21屆議員名冊 ${n} 位`,
      placeholderNote: "議員名冊（選區／科系／年級／學號／手機）由選舉結果匯入，顯示於各列下方；此處可校正姓名/信箱/身分或停用。列席／旁聽等非議員可用上方表單手動新增。",
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
    zh: "國立臺東大學學生議會 · 數位法典暨議事系統",
    en: "NTTU STUDENT ASSOCIATION · 2026",
    versionHint: "版本 · commit 短碼 · 建置時間（台北）。推版後這裡的時間沒變，就是那次部署沒生效。",
  },
} as const;
