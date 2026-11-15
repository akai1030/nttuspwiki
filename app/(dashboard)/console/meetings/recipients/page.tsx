import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/guard";
import { listRecipients } from "@/lib/meetings/queries";
import { Input } from "@/components/SearchBox";
import { copy } from "@/lib/copy";
import { addRecipient, toggleRecipient, updateRecipient, deleteRecipient } from "../actions";
import { reissueVoteLink, updateRecipientLogin } from "../vote-actions";
import { CopyButton } from "@/components/CopyBlock";
import { gmailComposeUrl, voteLinkMail, votePath } from "@/lib/meetings/vote-link";
import { phoneLast4 } from "@/lib/meetings/voter-login";
import { siteOrigin } from "@/lib/site-origin";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: `${copy.meetings.recipients.title}｜${copy.console.title}`,
  robots: { index: false, follow: false },
};

const c = copy.meetings.recipients;
const vr = copy.meetings.vote.roster;
const ROLES = ["議員", "列席", "旁聽", "祕書處"] as const;

const label = "flex flex-col gap-1 font-sans text-caption font-medium text-ink";
const select =
  "w-full rounded-sm border border-line bg-paper px-3.5 py-2.5 font-sans text-body text-ink focus:border-accent";
const btn =
  "border border-line px-3 py-1.5 font-ui text-caption font-medium leading-none tracking-snug text-ink transition-colors hover:border-accent hover:text-accent";
const btnSolid =
  "border border-ink bg-ink px-4 py-2 font-ui text-caption font-medium leading-none tracking-snug text-white transition-colors hover:border-accent hover:bg-accent";
const summary = "cursor-pointer font-sans text-caption font-medium text-accent hover:underline";

type Row = Awaited<ReturnType<typeof listRecipients>>[number];

/**
 * 名冊：每人一列唯讀摘要，編輯、投票登入資料、專屬投票連結收在「編輯」裡。
 * 依屆別分組（新的在上），停用的另外收起來。
 */
export default async function RecipientsPage(props: { searchParams: Promise<{ loginError?: string }> }) {
  const { loginError } = await props.searchParams;
  // 名冊含學號/手機/科系（個資），viewer 不得讀；officer（祕書處）需要維護名單故保留。
  await requireRole(["admin", "officer"]);
  const recipients = await listRecipients();
  const origin = await siteOrigin();

  const active = recipients.filter((r) => r.active);
  const inactive = recipients.filter((r) => !r.active);
  const sessions = [...new Set(active.map((r) => r.session))].sort((a, b) => b - a);
  const latestSession = Math.max(0, ...recipients.map((r) => r.session)) || 21;
  const roleRank = (r: Row) => ROLES.indexOf(r.roleTag as (typeof ROLES)[number]);

  return (
    <main className="mx-auto max-w-wrap px-wrap-sm py-section-sm hero:px-wrap">
      <h1 className="font-serif text-h2">{c.title}</h1>
      <p className="mt-2 max-w-reader font-sans text-body text-lede-ink">{c.lede}</p>
      <p className="mt-1 max-w-reader font-sans text-caption text-meta">{c.placeholderNote}</p>

      {loginError === "taken" ? (
        <p role="alert" className="mt-4 border border-warn-border bg-warn-surface px-3 py-2 font-sans text-caption text-warn-ink">
          {vr.studentIdTaken}
        </p>
      ) : null}

      <details className="mt-6 border border-line bg-paper2 px-4 py-3" open={recipients.length === 0}>
        <summary className={summary}>{c.addTitle}</summary>
        <form action={addRecipient} className="mt-3 grid gap-3 hero:grid-cols-4 hero:items-end">
          <label className={label}>
            {c.name}
            <Input name="name" required />
          </label>
          <label className={label}>
            {c.email}
            <Input name="email" type="email" required placeholder="name@example.com" />
          </label>
          <label className={label}>
            {c.roleTag}
            <select name="roleTag" defaultValue="議員" className={select}>
              {ROLES.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </label>
          <label className={label}>
            {c.session}
            <Input name="session" type="number" defaultValue={latestSession} />
          </label>
          <div className="hero:col-span-4">
            <button type="submit" className={btnSolid}>
              {c.add}
            </button>
          </div>
        </form>
      </details>

      {recipients.length === 0 ? (
        <p className="mt-8 border border-line bg-paper2 px-4 py-8 text-center font-sans text-body text-meta">{c.empty}</p>
      ) : null}

      {sessions.map((sn) => {
        const rows = active.filter((r) => r.session === sn).sort((a, b) => roleRank(a) - roleRank(b));
        return (
          <section key={sn} className="mt-8">
            <h2 className="font-serif text-art-name text-ink">
              {c.sessionGroup(sn)}
              <span className="ml-2 font-sans text-caption text-meta">{rows.length}</span>
            </h2>
            <ul className="mt-2 divide-y divide-line-soft border-y border-line-soft">
              {rows.map((r) => (
                <PersonRow key={r.id} r={r} origin={origin} />
              ))}
            </ul>
          </section>
        );
      })}

      {inactive.length > 0 ? (
        <details className="mt-8">
          <summary className={summary}>{c.inactiveGroup(inactive.length)}</summary>
          <ul className="mt-2 divide-y divide-line-soft border-y border-line-soft">
            {inactive.map((r) => (
              <PersonRow key={r.id} r={r} origin={origin} />
            ))}
          </ul>
        </details>
      ) : null}
    </main>
  );
}

function PersonRow({ r, origin }: { r: Row; origin: string }) {
  const isVoter = r.active && r.roleTag === "議員";
  const canLogin = Boolean(r.studentId?.trim() && phoneLast4(r.phone));
  const extra = [
    [r.department, r.grade].filter(Boolean).join(" "),
    r.district && r.district !== r.department && `${c.district} ${r.district}`,
  ].filter(Boolean);

  return (
    <li className="py-3">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="font-sans text-body font-medium text-ink">{r.name}</span>
        <span className="font-sans text-caption text-accent">{r.roleTag}</span>
        <span className="min-w-0 break-all font-sans text-caption text-meta">{r.email}</span>
        {isVoter ? (
          <span className={`font-sans text-caption ${canLogin ? "text-ink" : "text-warn-ink"}`}>
            {canLogin ? `✓ ${c.loginOk}` : `！${c.loginMissing}`}
          </span>
        ) : null}
        {!r.active ? <span className="font-sans text-caption text-meta">{c.inactive}</span> : null}
      </div>
      {extra.length > 0 ? <p className="font-sans text-caption text-meta">{extra.join("・")}</p> : null}

      <details className="mt-1">
        <summary className={summary}>{c.edit}</summary>
        <div className="mt-2 flex flex-col gap-4 border-l-2 border-line-soft pl-3">
          <form action={updateRecipient} className="grid gap-3 hero:grid-cols-4 hero:items-end">
            <input type="hidden" name="id" value={r.id} />
            <label className={label}>
              {c.name}
              <Input name="name" defaultValue={r.name} />
            </label>
            <label className={label}>
              {c.email}
              <Input name="email" type="email" defaultValue={r.email} />
            </label>
            <label className={label}>
              {c.roleTag}
              <select name="roleTag" defaultValue={r.roleTag} className={select}>
                {ROLES.map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </label>
            <label className={label}>
              {c.session}
              <Input name="session" type="number" defaultValue={r.session} />
            </label>
            <div className="hero:col-span-4">
              <button type="submit" className={btn}>
                {c.save}
              </button>
            </div>
          </form>

          {isVoter ? (
            <form action={updateRecipientLogin} className="grid gap-3 hero:grid-cols-4 hero:items-end">
              <input type="hidden" name="id" value={r.id} />
              <p className="font-sans text-caption font-medium text-ink hero:col-span-4">{vr.loginFields}</p>
              <label className={label}>
                {c.studentId}
                <Input name="studentId" defaultValue={r.studentId ?? ""} />
              </label>
              <label className={label}>
                {c.phone}
                <Input name="phone" defaultValue={r.phone ?? ""} inputMode="tel" />
              </label>
              <div className="hero:col-span-4">
                <button type="submit" className={btn}>
                  {vr.updateLogin}
                </button>
              </div>
            </form>
          ) : null}

          {isVoter ? <VoteLinkRow r={r} origin={origin} /> : null}

          <div className="flex flex-wrap items-center gap-3">
            <form action={toggleRecipient}>
              <input type="hidden" name="id" value={r.id} />
              <button type="submit" className={btn}>
                {c.toggle}
              </button>
            </form>
            <form action={deleteRecipient}>
              <input type="hidden" name="id" value={r.id} />
              <button type="submit" className="font-sans text-caption text-meta transition-colors hover:text-warn-ink">
                {c.del}
              </button>
            </form>
          </div>
        </div>
      </details>
    </li>
  );
}

function VoteLinkRow({ r, origin }: { r: Row; origin: string }) {
  const url = origin + votePath(r.id, r.voteLinkVersion);
  const mail = voteLinkMail(r, url);
  return (
    <div>
      <p className="font-sans text-caption font-medium text-ink">{vr.heading}</p>
      <p className="mt-0.5 max-w-reader font-sans text-caption text-meta">{vr.lede}</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <a
          href={gmailComposeUrl(r.email, mail.subject, mail.body)}
          target="_blank"
          rel="noreferrer"
          className={btn}
        >
          {vr.mail} ↗
        </a>
        <CopyButton text={url} label={vr.copyLink} />
        <form action={reissueVoteLink}>
          <input type="hidden" name="id" value={r.id} />
          <button type="submit" className="font-sans text-caption text-meta transition-colors hover:text-warn-ink">
            {vr.reissue}
          </button>
        </form>
      </div>
      <p className="mt-1 font-sans text-caption text-meta">{vr.reissueHint}</p>
    </div>
  );
}
