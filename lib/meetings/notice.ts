/**
 * 開會通知／會議通知 套版 — 依 MEETINGS-MODULE.md §1 與 Kai 提供的多份真本。
 * 注意：真本格式因會議/祕書而異（稱謂、時段稱謂、有無地點/注意事項、署名皆不同），
 * 故本套版產「乾淨完整的草稿」，稱謂可帶入、其餘複製後由承辦自行增刪。
 * 純文字輸出，供站內生成後複製、人工貼到官方信箱寄出（決策：只生草稿、不自動外寄）。
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

export type GeneratedNotice = { subject: string; body: string };

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

export function buildSubject(m: MeetingForNotice, kind: NoticeKind): string {
  const tail = kind === "agenda" ? "議程" : "開會通知單";
  const verb = kind === "agenda" ? "【會議通知】" : "【開會通知】";
  return `${verb}檢送國立臺東大學${sessionZh(m.session)}議會「${m.academicYear}${m.name}」${tail}`;
}

export type NoticeOpts = {
  proposalCount?: number;
  noticeDate?: Date;
  audience?: string;
  signer?: string; // 署名，如「祕書處 祕書長 王小明」
  contactPhone?: string;
  contactEmail?: string;
};

export function buildBody(m: MeetingForNotice, kind: NoticeKind, opts: NoticeOpts = {}): string {
  const noticeDate = opts.noticeDate ?? new Date();
  const audience = opts.audience?.trim() || AUDIENCE_DEFAULT;
  const location = m.location?.trim() || "線上視訊會議";
  const docNumber = m.docNumber?.trim() || "東議字第＿＿＿＿號";
  const proposalCount = opts.proposalCount ?? 0;

  const lines: string[] = [];
  lines.push(`國立臺東大學${sessionZh(m.session)}議會 ${m.name} ${audience} 您好：`);
  lines.push("");
  lines.push(`本次${m.name}將於${rocDateTime(m.meetingAt)}，至${location}召開，`);
  lines.push(`會議通知已於${mmddWeek(noticeDate)}函送至出席、列席與旁聽人員單位（${docNumber}）。`);

  if (kind === "agenda") {
    const lastAttach = 1 + Math.max(proposalCount, 0);
    const attachRange = proposalCount > 0 ? `、提案與相關資料（附件2-${lastAttach}）` : "";
    lines.push(`檢附本次會議議程（附件1）${attachRange}之電子檔，敬請審閱。`);
  }

  lines.push("**註：會議須達二分之一以上代表出席方得開議，敬請代表撥冗與會。");
  lines.push("");
  lines.push("〔會議重要資訊〕");
  lines.push(`會議名稱：${m.name}`);
  lines.push(`會議時間：${rocDateTime(m.meetingAt)}`);
  lines.push(`會議地點：${location}`);
  if (m.meetingUrl?.trim()) lines.push(`會議連結：${m.meetingUrl.trim()}`);

  const notesBlock: string[] = [];
  if (m.proposalDeadline) {
    notesBlock.push(`一、本次會議提案截止繳交時間為${rocDeadline(m.proposalDeadline)}前。`);
  }
  if (m.notes?.trim()) {
    notesBlock.push(m.notes.trim());
  }
  if (notesBlock.length) {
    lines.push("備註：");
    lines.push(...notesBlock);
  }

  lines.push("");
  lines.push("〔會議注意事項〕");
  ATTENTION.forEach((t, i) => lines.push(`${i + 1}. ${t}`));

  const org = `國立臺東大學${sessionZh(m.session)}學生議會`;
  const signer = opts.signer?.trim() || "祕書處";
  lines.push("");
  lines.push("敬祝");
  lines.push("平安順心");
  lines.push(`${org} ${signer} 敬上`);

  const phone = opts.contactPhone?.trim();
  const email = opts.contactEmail?.trim();
  if (phone || email) {
    lines.push("────────────────────");
    lines.push(`${org} ${signer}`);
    if (phone) lines.push(`M：${phone}`);
    if (email) lines.push(`e-mail：${email}`);
  }

  return lines.join("\n");
}

export function generateNotice(m: MeetingForNotice, kind: NoticeKind, opts: NoticeOpts = {}): GeneratedNotice {
  return { subject: buildSubject(m, kind), body: buildBody(m, kind, opts) };
}
