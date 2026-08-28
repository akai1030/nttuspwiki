/**
 * 開會通知／會議通知 套版 — 依 MEETINGS-MODULE.md §1 與 Kai 提供的多份真本。
 * 注意：真本格式因會議/祕書而異（稱謂、時段稱謂、有無地點/注意事項、署名皆不同），
 * 故本套版產「乾淨完整的草稿」，稱謂可帶入、其餘複製後由承辦自行增刪。
 * 站內生成後複製、人工貼到官方信箱寄出（決策：只生草稿、不自動外寄）。
 *
 * 內部以 Line[]（每行為 Seg[]）表示，再分別 render 成純文字與 Gmail 相容 HTML：
 * 兩種輸出同源，不會各自漂移。buildBody() 的簽章與輸出與改版前逐字節相同。
 */
import { rocDateTime, mmddWeek, rocDeadline } from "./roc";
import { zhNumber } from "./sections";

export type NoticeKind = "notice" | "agenda";

export type MeetingForNotice = {
  session: number;
  academicYear: string;
  name: string;
  meetingAt: Date;
  location: string | null;
  meetingUrl: string | null;
  docNumber: string | null;
  proposalDeadline: Date | null;
  notes: string | null;
};

export type GeneratedNotice = { subject: string; body: string; html: string };

/** 行內標記種類。對應真本上實際出現的四種，不多不少。 */
export type MarkKind = "audience" | "critical" | "attachment" | "highlight";
export type Seg = string | { v: string; as: MarkKind };
export type Line = Seg[];

const AUDIENCE_DEFAULT = "議員代表";

// 會議注意事項（線上會議常用；非線上或不需要時複製後刪除即可）。
const ATTENTION = [
  "為確認人員身分，進入會議請使用「本名」之帳號要求加入會議，若主席與祕書無法辨識，不得進入會議。",
  "為確認人員身分，會議進行過程中請開鏡頭。",
  "為保證會議秩序，會議進行過程中請嚴謹遵守《國立臺東大學學生議會會議列席暨旁聽規則》，如：請在發言前舉手詢問主席等，若違反主席得進行處分。",
];

function sessionZh(session: number): string {
  return `第${zhNumber(session)}屆`;
}

export function buildSubject(m: MeetingForNotice, kind: NoticeKind, opts: NoticeOpts = {}): string {
  const tail = kind === "agenda" ? "議程" : "開會通知單";
  const verb = kind === "agenda" ? "【會議通知】" : "【開會通知】";
  // 補寄更正版時真本會在最前面加「檔案更正_」；留空即維持原主旨。
  const p = opts.subjectPrefix?.trim();
  const prefix = p ? (p.endsWith("_") ? p : `${p}_`) : "";
  return `${prefix}${verb}檢送國立臺東大學${sessionZh(m.session)}議會「${m.academicYear}${m.name}」${tail}`;
}

export type NoticeOpts = {
  proposalCount?: number;
  noticeDate?: Date;
  audience?: string;
  signer?: string; // 署名，如「祕書處 祕書長 王小明」
  contactPhone?: string;
  contactEmail?: string;
  subjectPrefix?: string; // 主旨前綴，如「檔案更正」
};

/** 通知內文的結構化表示。純文字與 HTML 皆由此 render。 */
export function buildNoticeLines(
  m: MeetingForNotice,
  kind: NoticeKind,
  opts: NoticeOpts = {}
): Line[] {
  const noticeDate = opts.noticeDate ?? new Date();
  const audience = opts.audience?.trim() || AUDIENCE_DEFAULT;
  const location = m.location?.trim() || "線上視訊會議";
  const docNumber = m.docNumber?.trim() || "東議字第＿＿＿＿號";
  const proposalCount = opts.proposalCount ?? 0;

  const lines: Line[] = [];
  // 真本：稱謂加粗（<b>議員</b>）。
  lines.push([
    `國立臺東大學${sessionZh(m.session)}議會 ${m.name} `,
    { v: audience, as: "audience" },
    " 您好：",
  ]);
  lines.push([]);
  // 真本：只有這一句的日期時間標紅粗；下方「會議時間：」那行不標。
  lines.push([
    `本次${m.name}將於`,
    { v: rocDateTime(m.meetingAt), as: "critical" },
    `，至${location}召開，`,
  ]);
  lines.push([`會議通知已於${mmddWeek(noticeDate)}函送至出席、列席與旁聽人員單位（${docNumber}）。`]);

  if (kind === "agenda") {
    const lastAttach = 1 + Math.max(proposalCount, 0);
    // 真本：附件字樣綠色＋粗體＋底線（三重）。
    const seg: Line = ["檢附本次", { v: "會議議程（附件1）", as: "attachment" }];
    if (proposalCount > 0) {
      seg.push("、", { v: `提案與相關資料（附件2-${lastAttach}）`, as: "attachment" });
    }
    seg.push("之電子檔，敬請審閱。");
    lines.push(seg);
  }

  lines.push(["**註：會議須達二分之一以上代表出席方得開議，敬請代表撥冗與會。"]);
  lines.push([]);
  lines.push([{ v: "〔會議重要資訊〕", as: "highlight" }]);
  lines.push([`會議名稱：${m.name}`]);
  lines.push([`會議時間：${rocDateTime(m.meetingAt)}`]);
  lines.push([`會議地點：${location}`]);
  if (m.meetingUrl?.trim()) lines.push([`會議連結：${m.meetingUrl.trim()}`]);

  const notesBlock: string[] = [];
  if (m.proposalDeadline) {
    notesBlock.push(`一、本次會議提案截止繳交時間為${rocDeadline(m.proposalDeadline)}前。`);
  }
  if (m.notes?.trim()) {
    notesBlock.push(m.notes.trim());
  }
  if (notesBlock.length) {
    lines.push(["備註："]);
    // 備註可能是多行（使用者自行換行）。拆成獨立的 Line，HTML 才不會擠成一段；
    // 純文字端 split+join 為恆等，輸出不變。
    for (const b of notesBlock) for (const t of b.split("\n")) lines.push([t]);
  }

  lines.push([]);
  lines.push([{ v: "〔會議注意事項〕", as: "highlight" }]);
  ATTENTION.forEach((t, i) => lines.push([`${i + 1}. ${t}`]));

  const org = `國立臺東大學${sessionZh(m.session)}學生議會`;
  const signer = opts.signer?.trim() || "祕書處";
  lines.push([]);
  lines.push(["敬祝"]);
  lines.push(["平安順心"]);
  lines.push([`${org} ${signer} 敬上`]);

  const phone = opts.contactPhone?.trim();
  const email = opts.contactEmail?.trim();
  if (phone || email) {
    lines.push(["────────────────────"]);
    lines.push([`${org} ${signer}`]);
    if (phone) lines.push([`M：${phone}`]);
    if (email) lines.push([`e-mail：${email}`]);
  }

  return lines;
}

const textOf = (s: Seg): string => (typeof s === "string" ? s : s.v);

export function renderNoticeText(lines: Line[]): string {
  return lines.map((l) => l.map(textOf).join("")).join("\n");
}

/**
 * Gmail 相容 HTML — 標記語法刻意複製 Gmail 撰寫視窗自己產生的 DOM。
 * 事實依據：2026-08-24 由 nttusp@ 寄出的真本（Gmail message 1a031df341df7c80）。
 *
 * ⚠ 這幾個色碼是「真本保真」（CLAUDE.md 第 1 條），不是設計 token（第 5 條）：
 * 它們是 Google 調色盤的值，與 styles/tokens.css 無關。
 * 不要改成 var()（Gmail 不解析 CSS 變數），不要加進 tokens.css，不要借用既有色票。
 *
 * 連結：真本的 <a> 是 Gmail 自行 linkify 產生的、不帶任何 style，
 * 所以這裡輸出純文字 URL、不自產 <a> —— 順帶消滅 href 注入面。
 * 也不設 font-family / font-size，讓它繼承收件匣的預設，不跟承辦的簽名打架。
 */
const WRAP: Record<MarkKind, [string, string]> = {
  audience: ["<b>", "</b>"], // 真本：<b>議員</b>
  critical: ['<b><font color="#e06666">', "</font></b>"], // 真本：日期紅粗
  attachment: ['<u><b><font color="#6aa84f">', "</font></b></u>"], // 真本：綠＋粗＋底線
  highlight: ['<span style="background-color:rgb(234,153,153)">', "</span>"], // 真本：粉紅螢光底
};

const ESC: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};
const esc = (s: string) => s.replace(/[&<>"']/g, (ch) => ESC[ch]!);

export function renderNoticeHtml(lines: Line[]): string {
  return lines
    .map((l) => {
      const inner = l
        .map((s) => (typeof s === "string" ? esc(s) : WRAP[s.as][0] + esc(s.v) + WRAP[s.as][1]))
        .join("");
      // 換行/空行結構照真本：一般行 <div>…</div>，空行 <div><br></div>。
      return inner ? `<div>${inner}</div>` : "<div><br></div>";
    })
    .join("");
}

/** 純文字內文。簽章與輸出與改版前完全相同。 */
export function buildBody(m: MeetingForNotice, kind: NoticeKind, opts: NoticeOpts = {}): string {
  return renderNoticeText(buildNoticeLines(m, kind, opts));
}

export function generateNotice(
  m: MeetingForNotice,
  kind: NoticeKind,
  opts: NoticeOpts = {}
): GeneratedNotice {
  const lines = buildNoticeLines(m, kind, opts);
  return {
    subject: buildSubject(m, kind, opts),
    body: renderNoticeText(lines),
    html: renderNoticeHtml(lines),
  };
}
