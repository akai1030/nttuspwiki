/**
 * 會議頁的五個步驟。照實際做事的時間順序排：建會議 → 寄開會通知 → 收提案排議程 → 開會 → 會後。
 *
 * 每一步一個分頁（`/console/meetings/<slug>?step=…`），第 4 步是現場議事頁（`/live`）。
 * 這裡只放純函式（不碰資料庫），會議頁、會議列表與後台首頁共用。
 */
import { daysBetween, type Milestone } from "./timeline";

export const STEP_KEYS = ["info", "notice", "agenda", "live", "after"] as const;
export type StepKey = (typeof STEP_KEYS)[number];

export type StepMeeting = {
  status: "DRAFT" | "NOTICED" | "HELD" | "CLOSED";
  meetingAt: Date;
  liveOpen: boolean;
  notices: { kind: string }[];
};

export function parseStep(v: string | string[] | undefined): StepKey | null {
  const s = Array.isArray(v) ? v[0] : v;
  return (STEP_KEYS as readonly string[]).includes(s ?? "") ? (s as StepKey) : null;
}

/** 網址沒指定步驟時開哪一步：照會議狀態與日期推「現在該做的事」。 */
export function suggestedStep(m: Pick<StepMeeting, "status" | "meetingAt" | "liveOpen">, now: Date): StepKey {
  if (m.status === "CLOSED" || m.status === "HELD") return "after";
  const d = daysBetween(now, m.meetingAt);
  if (m.liveOpen || d === 0) return "live";
  if (d < 0) return "after";
  if (m.status === "NOTICED") return "agenda";
  return "notice";
}

/** 這一步做完了沒。只看資料推得出來的事，推不出來的（例如信寄了沒）靠祕書處按「已寄出」改狀態。 */
export function stepDone(m: StepMeeting, step: StepKey): boolean {
  switch (step) {
    case "info":
      return true;
    case "notice":
      return m.status !== "DRAFT";
    case "agenda":
      return m.notices.some((n) => n.kind === "agenda");
    case "live":
      return m.status === "HELD" || m.status === "CLOSED";
    case "after":
      return m.status === "CLOSED";
  }
}

/** 這一步的期限：取籌備時間軸上對應的那一天。第 1、5 步沒有固定期限。 */
export function stepDue(timeline: Milestone[], meetingAt: Date, step: StepKey): Date | null {
  if (step === "notice") return timeline.find((t) => t.key === "notice")?.date ?? null;
  if (step === "agenda") return timeline.find((t) => t.key === "agenda")?.date ?? null;
  if (step === "live") return meetingAt;
  return null;
}

/** 第 3 步要看的時程：提案截止、程序委員會、函送議程。 */
export function agendaMilestones(timeline: Milestone[]): Milestone[] {
  return timeline.filter((t) => t.key === "deadline" || t.key === "committee-law" || t.key === "agenda");
}

export function stepHref(meetingKey: string, step: StepKey): string {
  const base = `/console/meetings/${meetingKey}`;
  if (step === "live") return `${base}/live`;
  return `${base}?step=${step}`;
}
