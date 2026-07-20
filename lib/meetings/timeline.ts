/**
 * 會議籌備時間軸 — 由「會議日期」往回推出各籌備里程碑（提案截止、寄開會通知、函送議程、會前提醒），
 * 每個里程碑連到可執行動作（生成對應郵件 / 加提醒）。
 *
 * ⚠️ 這裡的天數是「常用預設」，非法定精確值。實際期限應以《組織章程》《議事規則》為準；
 *    待確認後再把 OFFSETS 對齊法源（見 MEETINGS-MODULE.md）。提案截止優先用會議設定的實際值。
 */
export type MilestoneAction = "notice" | "agenda" | "remind" | "deadline" | "meeting" | "custom" | "law";

export type Milestone = {
  key: string;
  title: string;
  date: Date;
  action: MilestoneAction;
  hint: string;
  id?: string; // 自訂里程碑（委員會等）才有，供刪除
  source?: string; // 法源引用（law 型），如「各委員會實行細則 §21」
  sourceHref?: string; // 連回法規原文
  offsetDays?: number; // 供「加入提醒」用（會前天數）
};

export type CustomMilestone = { id: string; title: string; at: Date; note: string | null };

// 會前天數（預設，可調）。
export const PREP_OFFSETS = { notice: 14, deadline: 10, agenda: 3, remind: 1 } as const;

// 法定委員會期限：程序暨法規委員會應於常會/臨時會「前六日」召開、編擬議程表。
// 法源：《國立臺東大學學生議會各委員會實行細則》§21（已驗於 DB，資料保真）。
export const COMMITTEE_LAW_OFFSET = 6;

const DAY = 24 * 60 * 60 * 1000;

export function buildTimeline(
  m: { meetingAt: Date; proposalDeadline: Date | null; kind?: string },
  custom: CustomMilestone[] = []
): Milestone[] {
  const M = m.meetingAt.getTime();
  // §10《會議之種類》、§20《提案日程》為議會常會/臨時會之法定條文；委員會會議不適用（不掛）。
  const isAssembly = m.kind !== "COMMITTEE";
  const items: Milestone[] = [
    {
      key: "notice",
      title: "寄送開會通知單",
      date: new Date(M - PREP_OFFSETS.notice * DAY),
      action: "notice",
      hint: "生成開會通知，貼到官方信箱寄給議員與列席人員。",
      offsetDays: PREP_OFFSETS.notice,
    },
    {
      key: "deadline",
      title: "提案繳交截止",
      date: m.proposalDeadline ?? new Date(M - PREP_OFFSETS.deadline * DAY),
      action: "deadline",
      hint: "議員提案繳交截止（用會議設定的實際截止時間）。一般提案應於開會十日前送達祕書處。",
      ...(isAssembly
        ? { source: "學生議會組織及實行準則 §20", sourceHref: "/law/2.0#art-20" }
        : {}),
    },
    {
      key: "agenda",
      title: "函送會議議程",
      date: new Date(M - PREP_OFFSETS.agenda * DAY),
      action: "agenda",
      hint: "生成會議通知（含議程附件），寄給出席、列席與旁聽人員。",
    },
    {
      key: "remind",
      title: "會前提醒議員",
      date: new Date(M - PREP_OFFSETS.remind * DAY),
      action: "remind",
      hint: "提醒議員撥冗與會，避免不足額流會。",
    },
    {
      key: "meeting",
      title: "會議召開",
      date: m.meetingAt,
      action: "meeting",
      hint: isAssembly
        ? "會議當天。常會由議長每月召開一次；臨時會由議長主動召開，或經至少全體議員五分之二連署召開。"
        : "會議當天。",
      ...(isAssembly
        ? { source: "學生議會組織及實行準則 §10", sourceHref: "/law/2.0#art-10" }
        : {}),
    },
  ];

  // 法定委員會期限（常會/臨時會才適用；委員會本身不掛）。
  if (m.kind !== "COMMITTEE") {
    items.push({
      key: "committee-law",
      title: "程序暨法規委員會召開",
      date: new Date(M - COMMITTEE_LAW_OFFSET * DAY),
      action: "law",
      hint: "應於常會、臨時會前六日召開，編擬議程表。",
      source: "各委員會實行細則 §21",
      sourceHref: "/law/2.1#art-21",
      offsetDays: COMMITTEE_LAW_OFFSET,
    });
  }

  for (const cm of custom) {
    items.push({
      key: `custom-${cm.id}`,
      title: cm.title,
      date: cm.at,
      action: "custom",
      hint: cm.note ?? "",
      id: cm.id,
    });
  }
  return items.sort((a, b) => a.date.getTime() - b.date.getTime());
}

/** 相對今天的天數差（正＝未來、0＝今天、負＝已過），以整日計。 */
export function daysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / DAY);
}
