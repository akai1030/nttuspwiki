import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/guard";
import { getMeetingByKey, listRecipients } from "@/lib/meetings/queries";
import { meetingKey } from "@/lib/meetings/slug";
import { parseStep, stepHref, suggestedStep } from "@/lib/meetings/steps";
import { copy } from "@/lib/copy";
import { MeetingShell } from "./_parts/shell";
import { InfoStep } from "./_parts/info";
import { NoticeStep } from "./_parts/notice-step";
import { AgendaStep } from "./_parts/agenda";
import { AfterStep } from "./_parts/after";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: `${copy.meetings.title}｜${copy.console.title}`,
  robots: { index: false, follow: false },
};

/**
 * 單一會議。五步分頁（lib/meetings/steps.ts）：?step=info｜notice｜agenda｜after，第 4 步是 ./live。
 * 沒帶 step 時依會議狀態與日期開「現在該做的那一步」。
 */
export default async function MeetingDetailPage(props: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ step?: string | string[] }>;
}) {
  const [params, sp] = await Promise.all([props.params, props.searchParams]);
  const user = await requireUser();
  const m = await getMeetingByKey(params.slug);
  if (!m) notFound();

  const asked = parseStep(sp.step);
  // 以舊 cuid 或非正規鍵進來 → 轉到 slug。用 307（Next 預設）不用 308：
  // slug 允許手動改，308 會被瀏覽器永久快取成一條清不掉的死映射。
  if (m.slug && m.slug !== params.slug) redirect(asked ? stepHref(m.slug, asked) : `/console/meetings/${m.slug}`);

  const step = asked ?? suggestedStep(m, new Date());
  if (step === "live") redirect(stepHref(meetingKey(m), "live"));

  const needRecipients = step === "notice" || step === "agenda";
  const all = needRecipients ? await listRecipients() : [];
  const active = all.filter((r) => r.active);
  const recipientMap = new Map(all.map((r) => [r.id, r]));

  return (
    <MeetingShell m={m} step={step}>
      {step === "info" ? <InfoStep m={m} isAdmin={user.role === "admin"} /> : null}
      {step === "notice" ? <NoticeStep m={m} recipients={active} recipientMap={recipientMap} /> : null}
      {step === "agenda" ? <AgendaStep m={m} recipients={active} recipientMap={recipientMap} /> : null}
      {step === "after" ? <AfterStep m={m} /> : null}
    </MeetingShell>
  );
}
