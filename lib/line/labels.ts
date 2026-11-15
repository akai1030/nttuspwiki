import { copy } from "@/lib/copy";
import { rocDateTime } from "@/lib/meetings/roc";
import type { ReminderState } from "./plan";

/** 提醒狀態在後台顯示的字。LINE 沒設定或沒選群組時，到期的提醒改提示人工處理。 */
export function reminderStateLabel(state: ReminderState, sentAt: Date | null, lineReady: boolean): string {
  const s = copy.line.panel.state;
  switch (state) {
    case "sent":
      return s.sent(sentAt ? rocDateTime(sentAt) : "");
    case "manual":
      return s.manual;
    case "skipped":
      return s.skipped;
    case "missed":
      return s.missed;
    case "failed":
      return s.failed;
    case "retrying":
      return s.retrying;
    case "due":
      return lineReady ? s.due : s.offDue;
    case "pending":
      return s.pending;
  }
}

/** 狀態字的顏色（只用色名）。 */
export function reminderStateTone(state: ReminderState): string {
  if (state === "sent" || state === "manual") return "text-sch";
  if (state === "failed" || state === "retrying" || state === "missed") return "text-warn-ink";
  return "text-meta";
}
