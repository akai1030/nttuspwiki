import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/guard";
import { prisma } from "@/lib/db";
import { copy } from "@/lib/copy";
import { rocDateTime } from "@/lib/meetings/roc";
import { firstParam } from "@/lib/search-param";
import { siteOrigin } from "@/lib/site-origin";
import { lineConfig, lineConfigStatus } from "@/lib/line/config";
import { groupMemberCount, messageConsumption, messageQuota } from "@/lib/line/client";
import { listGroups, selectedGroup } from "@/lib/line/groups";
import { reminderState } from "@/lib/line/plan";
import { reminderStateLabel, reminderStateTone } from "@/lib/line/labels";
import { CopyButton } from "@/components/CopyBlock";
import {
  dispatchLineNow,
  refreshLineGroupName,
  selectLineGroup,
  sendLineTest,
  unselectLineGroup,
} from "./actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: `${copy.line.title}｜${copy.console.title}`,
  robots: { index: false, follow: false },
};

const c = copy.line;

const btn =
  "border border-line px-3 py-2 font-ui text-caption font-medium leading-none tracking-snug text-ink transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-50";
const btnPrimary =
  "border border-ink bg-ink px-4 py-2.5 font-ui text-caption font-medium leading-none tracking-snug text-white transition-colors hover:border-accent hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50";

type SP = { ok?: string | string[]; err?: string | string[]; status?: string | string[]; sent?: string | string[]; skipped?: string | string[]; failed?: string | string[] };

function n(v: string | string[] | undefined): number {
  const x = Number(firstParam(v));
  return Number.isFinite(x) && x >= 0 ? Math.floor(x) : 0;
}

function flash(sp: SP): { kind: "ok" | "err"; text: string } | null {
  const ok = firstParam(sp.ok);
  const err = firstParam(sp.err);
  if (ok === "test") return { kind: "ok", text: c.actions.okTest };
  if (ok === "select") return { kind: "ok", text: c.actions.okSelect };
  if (ok === "unselect") return { kind: "ok", text: c.actions.okUnselect };
  if (ok === "dispatch") return { kind: "ok", text: c.actions.okDispatch(n(sp.sent), n(sp.skipped), n(sp.failed)) };
  if (err === "off") return { kind: "err", text: c.actions.errOff };
  if (err === "nogroup") return { kind: "err", text: c.actions.errNoGroup };
  if (err === "select") return { kind: "err", text: c.actions.errSelect };
  if (err === "send") return { kind: "err", text: c.actions.errSend(String(n(sp.status))) };
  return null;
}

export default async function LineSettingsPage(props: { searchParams?: Promise<SP> }) {
  await requireRole(["admin", "officer"], "/console/line");
  const sp = (await props.searchParams) ?? {};
  const cfg = lineConfig();
  const status = lineConfigStatus();
  const [groups, current, origin] = await Promise.all([listGroups(), selectedGroup(), siteOrigin()]);

  // 用量：向 LINE 查（查不到就顯示「查不到」，不影響頁面）。
  const [members, quota, used] = cfg
    ? await Promise.all([
        current ? groupMemberCount(cfg.token, current.id) : Promise.resolve(null),
        messageQuota(cfg.token),
        messageConsumption(cfg.token),
      ])
    : [null, null, null];

  const remainingReminders =
    members && quota?.limited && quota.value !== null && used !== null
      ? Math.max(0, Math.floor((quota.value - used) / members))
      : null;

  const history = await prisma.meetingReminder.findMany({
    where: { OR: [{ sentVia: "line" }, { lastError: { not: null } }] },
    orderBy: [{ sentAt: { sort: "desc", nulls: "first" } }, { fireAt: "desc" }],
    take: 20,
    include: { meeting: { select: { name: true, meetingAt: true } } },
  });
  const now = new Date();

  const f = flash(sp);
  const webhookUrl = `${origin}/api/line/webhook`;

  return (
    <main className="mx-auto max-w-wrap px-wrap-sm py-section-sm hero:px-wrap">
      <a href="/console" className="font-sans text-caption text-accent hover:underline">
        {c.backToConsole}
      </a>
      <h1 className="mt-4 font-serif text-h2">{c.title}</h1>
      <p className="mt-2 max-w-reader font-sans text-body text-lede-ink">{c.lede}</p>

      {f ? (
        <p
          role={f.kind === "err" ? "alert" : "status"}
          className={
            "mt-4 border px-4 py-3 font-sans text-caption " +
            (f.kind === "err" ? "border-warn-border bg-warn-surface text-warn-ink" : "border-line bg-paper2 text-ink")
          }
        >
          {f.text}
        </p>
      ) : null}

      {/* 連線設定 */}
      <section className="mt-8 border border-line bg-paper p-card">
        <h2 className="font-serif text-h4">{c.config.title}</h2>
        {!cfg ? (
          <p className="mt-3 border border-warn-border bg-warn-surface px-4 py-3 font-sans text-caption text-warn-ink">
            {c.config.off}
          </p>
        ) : null}
        {cfg && !status.cron ? (
          <p className="mt-3 border border-warn-border bg-warn-surface px-4 py-3 font-sans text-caption text-warn-ink">
            {c.config.cronOff}
          </p>
        ) : null}
        <dl className="mt-4 grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2 font-sans text-body">
          {(
            [
              [c.config.token, status.token],
              [c.config.secret, status.secret],
              [c.config.cron, status.cron],
            ] as const
          ).map(([label, on]) => (
            <div key={label} className="contents">
              <dt className="text-meta">{label}</dt>
              <dd className={on ? "text-ink" : "text-warn-ink"}>{on ? c.config.set : c.config.unset}</dd>
            </div>
          ))}
          <dt className="text-meta">{c.config.webhook}</dt>
          <dd className="flex flex-wrap items-center gap-3">
            <span className="break-all text-ink">{webhookUrl}</span>
            <CopyButton text={webhookUrl} />
          </dd>
        </dl>
        <p className="mt-2 font-sans text-caption text-meta">{c.config.webhookHint}</p>
      </section>

      {/* 發送群組 */}
      <section className="mt-6 border border-line bg-paper p-card">
        <h2 className="font-serif text-h4">{c.groups.title}</h2>
        <p className="mt-2 font-sans text-caption text-meta">{c.groups.lede}</p>
        {!current && groups.length > 0 ? (
          <p className="mt-3 font-sans text-caption text-warn-ink">{c.groups.none}</p>
        ) : null}
        {groups.length === 0 ? (
          <p className="mt-4 border border-line bg-paper2 px-4 py-6 font-sans text-body text-meta">{c.groups.empty}</p>
        ) : (
          <ul className="mt-4 divide-y divide-line-soft border-y border-line-soft">
            {groups.map((g) => {
              const isCurrent = current?.id === g.id;
              return (
                <li key={g.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
                  <div className="min-w-0">
                    <div className="font-sans text-body text-ink">
                      {g.name || c.groups.unnamed}
                      {isCurrent ? (
                        <span className="ml-2 border border-accent px-2 py-0.5 font-sans text-caption text-accent">
                          {c.groups.selected}
                        </span>
                      ) : null}
                    </div>
                    <div className="font-sans text-caption text-meta">
                      {g.leftAt
                        ? `${c.groups.leftAt} ${rocDateTime(g.leftAt)}`
                        : `${c.groups.joinedAt} ${rocDateTime(g.joinedAt)}`}
                      <span className="mx-1.5 text-line">·</span>
                      <span className="break-all">{g.id}</span>
                    </div>
                  </div>
                  <div className="ml-auto flex flex-wrap items-center gap-2">
                    {cfg && !g.leftAt ? (
                      <form action={refreshLineGroupName}>
                        <input type="hidden" name="groupId" value={g.id} />
                        <button type="submit" className={btn}>
                          {c.groups.refreshName}
                        </button>
                      </form>
                    ) : null}
                    {isCurrent ? (
                      <form action={unselectLineGroup}>
                        <input type="hidden" name="groupId" value={g.id} />
                        <button type="submit" className={btn}>
                          {c.groups.unselect}
                        </button>
                      </form>
                    ) : !g.leftAt ? (
                      <form action={selectLineGroup}>
                        <input type="hidden" name="groupId" value={g.id} />
                        <button type="submit" className={btnPrimary}>
                          {c.groups.select}
                        </button>
                      </form>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* 本月用量 */}
      {cfg ? (
        <section className="mt-6 border border-line bg-paper p-card">
          <h2 className="font-serif text-h4">{c.usage.title}</h2>
          <dl className="mt-4 grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2 font-sans text-body">
            <dt className="text-meta">{c.usage.members}</dt>
            <dd className="tnum text-ink">{members !== null ? c.usage.membersN(members) : c.usage.unknown}</dd>
            <dt className="text-meta">{c.usage.used}</dt>
            <dd className="tnum text-ink">{used !== null ? c.usage.count(used) : c.usage.unknown}</dd>
            <dt className="text-meta">{c.usage.limit}</dt>
            <dd className="tnum text-ink">
              {quota === null
                ? c.usage.unknown
                : quota.limited && quota.value !== null
                  ? c.usage.count(quota.value)
                  : c.usage.unlimited}
            </dd>
            <dt className="text-meta">{c.usage.remaining}</dt>
            <dd className="tnum text-ink">
              {remainingReminders !== null ? c.usage.remainingN(remainingReminders) : c.usage.unknown}
            </dd>
          </dl>
          <p className="mt-3 font-sans text-caption text-meta">{c.usage.hint}</p>
        </section>
      ) : null}

      {/* 手動操作 */}
      <section className="mt-6 border border-line bg-paper p-card">
        <h2 className="font-serif text-h4">{c.actions.title}</h2>
        <div className="mt-4 grid gap-5 hero:grid-cols-2">
          <form action={sendLineTest} className="flex flex-col items-start gap-2">
            <button type="submit" className={btnPrimary} disabled={!cfg || !current}>
              {c.actions.test}
            </button>
            <p className="font-sans text-caption text-meta">{c.actions.testHint(members)}</p>
          </form>
          <form action={dispatchLineNow} className="flex flex-col items-start gap-2">
            <button type="submit" className={btnPrimary} disabled={!cfg || !current}>
              {c.actions.dispatch}
            </button>
            <p className="font-sans text-caption text-meta">{c.actions.dispatchHint}</p>
          </form>
        </div>
      </section>

      {/* 最近發送紀錄 */}
      <section className="mt-6 border border-line bg-paper p-card">
        <h2 className="font-serif text-h4">{c.history.title}</h2>
        {history.length === 0 ? (
          <p className="mt-3 font-sans text-caption text-meta">{c.history.empty}</p>
        ) : (
          <ul className="mt-4 divide-y divide-line-soft border-y border-line-soft">
            {history.map((r) => {
              const state = reminderState(r, r.meeting.meetingAt, now);
              return (
              <li key={r.id} className="py-3 font-sans text-caption">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="text-body text-ink">{r.meeting.name}</span>
                  <span className="text-meta">{copy.line.panel.offset(r.offsetDays)}</span>
                  <span className={`tnum ${reminderStateTone(state)}`}>
                    {reminderStateLabel(state, r.sentAt, Boolean(cfg && current))}
                  </span>
                </div>
                {r.lineRequestId ? (
                  <div className="mt-1 text-meta">
                    {c.history.requestId} <span className="break-all">{r.lineRequestId}</span>
                  </div>
                ) : null}
                {r.lastError && !r.sentAt ? (
                  <div className="mt-1 break-all text-warn-ink">
                    {c.history.error}：{r.lastError}
                  </div>
                ) : null}
              </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
