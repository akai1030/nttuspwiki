/**
 * 開會通知／會議通知 套版 — 依 MEETINGS-MODULE.md §1 的官方公版（Kai Gmail 撈到的真本）。
 * 純文字輸出，供站內生成後複製、人工貼到官方信箱寄出（決策：只生草稿、不自動外寄）。
 * 祕書長署名採通用「祕書處 敬上」，避免寫死特定人員；使用者複製後可自行補簽名。
 */
import { rocDateTimeFull, rocDateTime, mmddWeek, rocDeadline } from "./roc";
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

function sessionZh(session: number): string {
  return `第${zhNumber(session)}屆`;
}

export function buildSubject(m: MeetingForNotice, kind: NoticeKind): string {
  const tail = kind === "agenda" ? "議程" : "開會通知單";
  const verb = kind === "agenda" ? "【會議通知】" : "【開會通知】";
  return `${verb}檢送國立臺東大學${sessionZh(m.session)}議會「${m.academicYear}${m.name}」${tail}`;
}

export function buildBody(
  m: MeetingForNotice,
  kind: NoticeKind,
  opts: { proposalCount?: number; noticeDate?: Date } = {}
): string {
  const noticeDate = opts.noticeDate ?? new Date();
  const location = m.location?.trim() || "線上視訊會議室";
  const docNumber = m.docNumber?.trim() || "東議字第＿＿＿＿號";
  const proposalCount = opts.proposalCount ?? 0;

  const lines: string[] = [];
  lines.push(`國立臺東大學${sessionZh(m.session)}議會${m.name} 議員代表 您好：`);
  lines.push("");
  lines.push(`本次${m.name}將於${rocDateTime(m.meetingAt)}，至${location}召開，`);
  lines.push(`會議通知已於${mmddWeek(noticeDate)}函送至出席與列席人員單位（${docNumber}）。`);

  // 會議通知（議程）多一句檢附說明；附件2-N，N = 1（議程）+ 提案數。
  if (kind === "agenda") {
    const lastAttach = 1 + Math.max(proposalCount, 0);
    const attachRange = proposalCount > 0 ? `、提案與相關資料（附件2-${lastAttach}）` : "";
    lines.push(`檢附本次會議議程（附件1）${attachRange}之電子檔，敬請審閱。`);
  }

  lines.push("**註：會議須達二分之一以上代表出席方得開議，敬請代表撥冗與會。");
  lines.push("");
  lines.push("〔會議重要資訊〕");
  lines.push(`議會常會｜${m.name}`);
  lines.push(`會議時間：${rocDateTimeFull(m.meetingAt)}`);
  lines.push(`會議連結：${m.meetingUrl?.trim() || "（待補）"}`);

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
  lines.push("敬祝 平安順心");
  lines.push(`國立臺東大學${sessionZh(m.session)}學生議會 祕書處 敬上`);

  return lines.join("\n");
}

export function generateNotice(
  m: MeetingForNotice,
  kind: NoticeKind,
  opts: { proposalCount?: number; noticeDate?: Date } = {}
): GeneratedNotice {
  return { subject: buildSubject(m, kind), body: buildBody(m, kind, opts) };
}
