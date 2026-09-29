import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/guard";
import { listRecipients } from "@/lib/meetings/queries";
import { Input } from "@/components/SearchBox";
import { copy } from "@/lib/copy";
import { addRecipient, toggleRecipient, updateRecipient, deleteRecipient } from "../actions";
import { reissueVoteLink, updateRecipientLogin } from "../vote-actions";
import { CopyButton } from "@/components/CopyBlock";
import { gmailComposeUrl, voteLinkMail, votePath } from "@/lib/meetings/vote-link";
import { siteOrigin } from "@/lib/site-origin";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: `${copy.meetings.recipients.title}｜${copy.console.title}`,
  robots: { index: false, follow: false },
};

const c = copy.meetings.recipients;
const vr = copy.meetings.vote.roster;

/**
 * 名冊列的欄寬。標題列與每一列共用同一組 template，各列才會對齊成表格。
 * 姓名與 Email 彈性、身分與屆別固定、儲存鈕自適應、最右是狀態與操作。
 * hero 斷點以下改為單欄堆疊（手機上欄位擠在一起反而更難點）。
 */
const COLS =
  "hero:grid-cols-[minmax(0,1fr)_minmax(0,2.2fr)_6rem_4.5rem_auto_minmax(0,auto)]";

/** 列內輸入框：填滿自己的 grid 格子，高度壓到 caption 級距。 */
const cell = "!py-1 text-caption";

export default async function RecipientsPage(props: { searchParams: Promise<{ loginError?: string }> }) {
  const { loginError } = await props.searchParams;
  // 名冊含學號/手機/科系（個資），viewer 不得讀；officer（祕書處）需要維護名單故保留。
  await requireRole(["admin", "officer"]);
  const recipients = await listRecipients();
  const memberCount = recipients.filter((r) => r.studentId).length;
  const origin = await siteOrigin();
  const hasVoters = recipients.some((r) => r.active && r.roleTag === "議員");

  return (
    <main className="mx-auto max-w-wrap px-wrap-sm py-section-sm hero:px-wrap">
      <a href="/console/meetings" className="font-sans text-caption text-accent hover:underline">
        ← {copy.meetings.title}
      </a>
      <h1 className="mt-4 font-serif text-h2">{c.title}</h1>
      <p className="mt-2 max-w-reader font-sans text-body text-lede-ink">{c.lede}</p>
      {memberCount > 0 && (
        <p className="mt-2 font-ui text-caption text-accent">{c.memberN(memberCount)}</p>
      )}
      <p className="mt-2 max-w-reader font-sans text-caption text-meta">{c.placeholderNote}</p>
      {loginError === "taken" ? (
        <p role="alert" className="mt-4 border border-warn-border bg-warn-surface px-3 py-2 font-sans text-caption text-warn-ink">
          {vr.studentIdTaken}
        </p>
      ) : null}
      {hasVoters ? (
        <div className="mt-4 max-w-reader border-l-[3px] border-accent bg-paper2 px-3.5 py-2.5">
          <p className="font-sans text-caption font-medium text-ink">{vr.heading}</p>
          <p className="mt-1 font-sans text-caption text-meta">{vr.lede}</p>
          <p className="mt-1 font-sans text-caption text-meta">{vr.reissueHint}</p>
        </div>
      ) : null}

      {/* 新增 */}
      <form
        action={addRecipient}
        className="mt-6 grid gap-3 border border-line bg-paper2 p-card hero:grid-cols-[1fr_1.4fr_0.8fr_0.6fr_auto] hero:items-end"
      >
        <div className="flex flex-col gap-1.5">
          <label htmlFor="r-name" className="font-sans text-caption font-medium text-ink">
            {c.name}
          </label>
          <Input id="r-name" name="name" required placeholder="議員01" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="r-email" className="font-sans text-caption font-medium text-ink">
            {c.email}
          </label>
          <Input id="r-email" name="email" type="email" required placeholder="name@example.com" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="r-role" className="font-sans text-caption font-medium text-ink">
            {c.roleTag}
          </label>
          <select
            id="r-role"
            name="roleTag"
            defaultValue="議員"
            className="w-full rounded-sm border border-line bg-paper px-3.5 py-2.5 font-sans text-body text-ink focus:border-accent"
          >
            <option>議員</option>
            <option>列席</option>
            <option>旁聽</option>
            <option>祕書處</option>
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="r-session" className="font-sans text-caption font-medium text-ink">
            {c.session}
          </label>
          <Input id="r-session" name="session" type="number" defaultValue={21} />
        </div>
        <button
          type="submit"
          className="h-[42px] border border-ink bg-ink px-4 font-ui text-caption font-medium leading-none tracking-snug text-white transition-colors hover:border-accent hover:bg-accent"
        >
          {c.add}
        </button>
      </form>

      {/* 清單 */}
      <div className="mt-8">
        {recipients.length === 0 ? (
          <p className="border border-line bg-paper2 px-4 py-8 text-center font-sans text-body text-meta">
            {c.empty}
          </p>
        ) : (
          <>
            {/* 欄位標題只出現一次；每列的輸入框改用 aria-label 對應。 */}
            <div
              className={`hidden border-b border-line pb-1.5 font-sans text-caption text-meta hero:grid ${COLS}`}
            >
              <span>{c.name}</span>
              <span>{c.email}</span>
              <span>{c.roleTag}</span>
              <span>{c.session}</span>
              <span className="sr-only">{c.save}</span>
              <span className="justify-self-end">{c.state}</span>
            </div>

            <ul className="divide-y divide-line-soft border-b border-line-soft">
              {recipients.map((r) => {
                const isVoter = r.active && r.roleTag === "議員";
                // 議員的學號、手機在下方「登入用」欄位編輯，這裡不重複列。
                const roster = [
                  !isVoter && r.studentId && `${c.studentId} ${r.studentId}`,
                  [r.department, r.grade].filter(Boolean).join(" "),
                  r.district && r.district !== r.department && `${c.district} ${r.district}`,
                  !isVoter && r.phone && `${c.phone} ${r.phone}`,
                ].filter(Boolean);
                return (
                  <li key={r.id} className={`items-center gap-x-2 gap-y-1.5 py-1.5 hero:grid ${COLS}`}>
                    {/* display:contents 讓表單的欄位直接落進外層 grid，各列才會對齊成表格。 */}
                    <form action={updateRecipient} className="contents">
                      <input type="hidden" name="id" value={r.id} />
                      <Input name="name" defaultValue={r.name} aria-label={c.name} className={cell} />
                      <Input
                        name="email"
                        type="email"
                        defaultValue={r.email}
                        aria-label={c.email}
                        className={cell}
                      />
                      <select
                        name="roleTag"
                        defaultValue={r.roleTag}
                        aria-label={c.roleTag}
                        className={`w-full rounded-sm border border-line bg-paper px-2 py-1 font-sans text-caption text-ink focus:border-accent`}
                      >
                        <option>議員</option>
                        <option>列席</option>
                        <option>旁聽</option>
                        <option>祕書處</option>
                      </select>
                      <Input
                        name="session"
                        type="number"
                        defaultValue={r.session}
                        aria-label={c.session}
                        className={cell}
                      />
                      <button
                        type="submit"
                        className="border border-ink bg-ink px-2.5 py-1 font-ui text-chip leading-none text-white transition-colors hover:border-accent hover:bg-accent"
                      >
                        {c.save}
                      </button>
                    </form>

                    <div className="flex items-center justify-end gap-2">
                      <span
                        className={"font-ui text-chip " + (r.active ? "text-accent" : "text-meta")}
                      >
                        {r.active ? c.active : c.inactive}
                      </span>
                      <form action={toggleRecipient}>
                        <input type="hidden" name="id" value={r.id} />
                        <button
                          type="submit"
                          className="border border-line px-2 py-1 font-ui text-chip leading-none text-ink transition-colors hover:border-accent hover:text-accent"
                        >
                          {c.toggle}
                        </button>
                      </form>
                      <form action={deleteRecipient}>
                        <input type="hidden" name="id" value={r.id} />
                        <button
                          type="submit"
                          className="font-ui text-chip text-meta transition-colors hover:text-warn-ink"
                        >
                          {c.del}
                        </button>
                      </form>
                    </div>

                    {roster.length > 0 && (
                      <p className="font-sans text-caption text-meta hero:col-span-6">
                        {roster.join("・")}
                      </p>
                    )}

                    {/* 議員專屬投票連結：只給啟用中的議員 */}
                    {isVoter ? (
                      <form action={updateRecipientLogin} className="flex flex-wrap items-center gap-2 hero:col-span-6">
                        <input type="hidden" name="id" value={r.id} />
                        <span className="font-ui text-chip text-meta">{vr.loginFields}</span>
                        <label className="flex items-center gap-1.5 font-sans text-caption text-meta">
                          {c.studentId}
                          <Input name="studentId" defaultValue={r.studentId ?? ""} className={`w-32 ${cell}`} />
                        </label>
                        <label className="flex items-center gap-1.5 font-sans text-caption text-meta">
                          {c.phone}
                          <Input name="phone" defaultValue={r.phone ?? ""} inputMode="tel" className={`w-36 ${cell}`} />
                        </label>
                        <button
                          type="submit"
                          className="border border-line px-2.5 py-1 font-ui text-chip leading-none text-ink transition-colors hover:border-accent hover:text-accent"
                        >
                          {vr.updateLogin}
                        </button>
                      </form>
                    ) : null}
                    {isVoter ? <VoteLinkRow r={r} origin={origin} /> : null}
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </main>
  );
}

function VoteLinkRow({
  r,
  origin,
}: {
  r: { id: string; name: string; email: string; session: number; voteLinkVersion: number };
  origin: string;
}) {
  const url = origin + votePath(r.id, r.voteLinkVersion);
  const mail = voteLinkMail(r, url);
  return (
    <div className="flex flex-wrap items-center gap-2 hero:col-span-6">
      <span className="font-ui text-chip text-meta">{vr.link}</span>
      <CopyButton text={url} label={vr.copyLink} />
      <a
        href={gmailComposeUrl(r.email, mail.subject, mail.body)}
        target="_blank"
        rel="noreferrer"
        className="border border-line px-3 py-1.5 font-ui text-caption font-medium leading-none tracking-snug text-ink transition-colors hover:border-accent hover:text-accent"
      >
        {vr.mail} ↗
      </a>
      <form action={reissueVoteLink}>
        <input type="hidden" name="id" value={r.id} />
        <button type="submit" className="font-ui text-chip text-meta transition-colors hover:text-warn-ink">
          {vr.reissue}
        </button>
      </form>
    </div>
  );
}
