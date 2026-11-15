import { prisma } from "@/lib/db";
import { copy } from "@/lib/copy";
import { DEFAULT_OFFSETS } from "@/lib/meetings/reminders";
import { rocDateTimeFull } from "@/lib/meetings/roc";
import { lineConfig, siteUrl } from "@/lib/line/config";
import { selectedGroup } from "@/lib/line/groups";
import { buildReminderText } from "@/lib/line/message";
import { effectiveFireAt, reminderState } from "@/lib/line/plan";
import { reminderStateLabel, reminderStateTone } from "@/lib/line/labels";
import {
  addReminder,
  deleteReminder,
  markReminderDone,
  unmarkReminderDone,
} from "@/app/(dashboard)/console/meetings/actions";
import { retryLineReminder } from "@/app/(dashboard)/console/line/actions";

/**
 * 會議頁的「會前提醒」區塊（取代 app/(dashboard)/console/meetings/[slug]/page.tsx 原本那一段）。
 * Server Component，自己查資料：掛的地方只要 <LineReminderPanel meetingId={m.id} />。
 *
 * - LINE 已設定且選了群組：到提醒時間後由排程發到群組，逐則顯示待發送／已發／失敗。
 * - LINE 沒設定或沒選群組：跟改版前一樣，到時間由祕書處自己通知、按「標記已處理」。
 * - 新增、刪除、標記已處理沿用 meetings/actions.ts 的 action；「重試」在 line/actions.ts。
 */
export async function LineReminderPanel({ meetingId }: { meetingId: string }) {
  const [meeting, group] = await Promise.all([
    prisma.meeting.findUnique({
      where: { id: meetingId },
      select: {
        id: true,
        slug: true,
        name: true,
        meetingAt: true,
        location: true,
        meetingUrl: true,
        proposalDeadline: true,
        isPublic: true,
        reminders: { orderBy: [{ offsetDays: "desc" }, { id: "asc" }] },
      },
    }),
    selectedGroup(),
  ]);
  if (!meeting) return null;

  const c = copy.line.panel;
  const r = copy.meetings.reminder;
  const ready = Boolean(lineConfig() && group);
  const now = new Date();
  const preview = buildReminderText(meeting, now, siteUrl());

  const btnLine =
    "border border-line px-2 py-1 font-sans text-caption leading-none text-ink transition-colors hover:border-accent hover:text-accent";

  return (
    <section className="border border-line bg-paper p-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="font-serif text-h4">{c.title}</h2>
        <a href="/console/line" className="font-sans text-caption text-accent hover:underline">
          {c.settings}
        </a>
      </div>
      <p className={`mt-2 font-sans text-caption ${ready ? "text-meta" : "text-warn-ink"}`}>
        {ready ? c.on(group?.name || copy.line.groups.unnamed) : lineConfig() ? c.noGroup : c.off}
      </p>

      <form action={addReminder} className="mt-4 flex flex-wrap items-end gap-3">
        <input type="hidden" name="meetingId" value={meeting.id} />
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`rem-off-${meeting.id}`} className="font-sans text-caption font-medium text-ink">
            {r.offsetDays}
          </label>
          <select
            id={`rem-off-${meeting.id}`}
            name="offsetDays"
            defaultValue={3}
            className="rounded-sm border border-line bg-paper px-3.5 py-2.5 font-sans text-body text-ink focus:border-accent"
          >
            {DEFAULT_OFFSETS.map((d) => (
              <option key={d} value={d}>
                {c.offset(d)}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="border border-ink bg-ink px-4 py-3 font-ui text-caption font-medium leading-none tracking-snug text-white transition-colors hover:border-accent hover:bg-accent"
        >
          {r.add}
        </button>
      </form>

      <ul className="mt-4 divide-y divide-line-soft">
        {meeting.reminders.length === 0 ? (
          <li className="py-2 font-sans text-caption text-meta">{r.empty}</li>
        ) : (
          meeting.reminders.map((rem) => {
            const state = reminderState(rem, meeting.meetingAt, now);
            return (
              <li key={rem.id} className="py-2 font-sans text-caption">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="text-ink">{c.offset(rem.offsetDays)}</span>
                  <span className="tnum text-meta">
                    {rocDateTimeFull(effectiveFireAt({ meetingAt: meeting.meetingAt, offsetDays: rem.offsetDays }))}
                  </span>
                  <span className={reminderStateTone(state)}>{reminderStateLabel(state, rem.sentAt, ready)}</span>
                  <div className="ml-auto flex items-center gap-2">
                    {state === "failed" ? (
                      <form action={retryLineReminder}>
                        <input type="hidden" name="id" value={rem.id} />
                        <button type="submit" className={btnLine}>
                          {c.retry}
                        </button>
                      </form>
                    ) : null}
                    {state === "manual" ? (
                      <form action={unmarkReminderDone}>
                        <input type="hidden" name="id" value={rem.id} />
                        <input type="hidden" name="meetingId" value={meeting.id} />
                        <button type="submit" className={btnLine}>
                          {r.undo}
                        </button>
                      </form>
                    ) : null}
                    {state === "failed" || (!ready && (state === "due" || state === "pending")) ? (
                      <form action={markReminderDone}>
                        <input type="hidden" name="id" value={rem.id} />
                        <input type="hidden" name="meetingId" value={meeting.id} />
                        <button type="submit" className={btnLine}>
                          {r.markDone}
                        </button>
                      </form>
                    ) : null}
                    <form action={deleteReminder}>
                      <input type="hidden" name="id" value={rem.id} />
                      <input type="hidden" name="meetingId" value={meeting.id} />
                      <button
                        type="submit"
                        className="font-sans text-caption text-meta transition-colors hover:text-warn-ink"
                      >
                        {r.del}
                      </button>
                    </form>
                  </div>
                </div>
                {rem.lastError && !rem.sentAt ? (
                  <p className="mt-1 break-all text-warn-ink">{rem.lastError}</p>
                ) : null}
              </li>
            );
          })
        )}
      </ul>

      <details className="mt-4 border-t border-line-soft pt-3">
        <summary className="cursor-pointer font-sans text-caption font-medium text-ink">{c.preview}</summary>
        <pre className="mt-2 whitespace-pre-wrap border border-line-soft bg-paper2 p-4 font-sans text-body text-ink">
          {preview}
        </pre>
        <p className="mt-1 font-sans text-caption text-meta">{c.previewHint}</p>
      </details>
    </section>
  );
}
