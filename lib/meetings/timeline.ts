/**
 * 會議籌備時間軸 — 由「會議日期」往回推出各籌備里程碑（提案截止、寄開會通知、函送議程、會前提醒），
 * 每個里程碑連到可執行動作（生成對應郵件 / 加提醒）。
 *
 * ⚠️ 這裡的天數是「常用預設」，非法定精確值。實際期限應以《組織章程》《議事規則》為準；
 *    待確認後再把 OFFSETS 對齊法源（見 MEETINGS-MODULE.md）。提案截止優先用會議設定的實際值。
 */
export type MilestoneAction = "notice" | "agenda" | "remind" | "deadline" | "meeting";

export type Milestone = {
  key: string;
  title: string;
  date: Date;
  action: MilestoneAction;
  hint: string;
};

// 會前天數（預設，可調）。
export const PREP_OFFSETS = { notice: 14, deadline: 10, agenda: 3, remind: 1 } as const;

const DAY = 24 * 60 * 60 * 1000;

export function buildTimeline(m: { meetingAt: Date; proposalDeadline: Date | null }): Milestone[] {
  const M = m.meetingAt.getTime();
  const items: Milestone[] = [
    {
      key: "notice",
      title: "寄送開會通知單",
      date: new Date(M - PREP_OFFSETS.notice * DAY),
      action: "notice",
      hint: "生成開會通知，貼到官方信箱寄給議員與列席人員。",
    },
    {
      key: "deadline",
      title: "提案繳交截止",
      date: m.proposalDeadline ?? new Date(M - PREP_OFFSETS.deadline * DAY),
      action: "deadline",
      hint: "議員提案繳交截止（用會議設定的實際截止時間）。",
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
      hint: "會議當天。",
    },
  ];
  return items.sort((a, b) => a.date.getTime() - b.date.getTime());
}

/** 相對今天的天數差（正＝未來、0＝今天、負＝已過），以整日計。 */
export function daysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / DAY);
}
