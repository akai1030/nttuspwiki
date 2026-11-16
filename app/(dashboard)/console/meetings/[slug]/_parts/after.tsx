import { ProposalTally } from "@/components/ProposalTally";
import { meetingKey } from "@/lib/meetings/slug";
import { stepHref } from "@/lib/meetings/steps";
import { ruleById } from "@/lib/meetings/vote-rules";
import { copy } from "@/lib/copy";
import { setMeetingStatus, updateProposalResolution } from "../../actions";
import { Block, btn, btnSolid, summaryCls, type MeetingFull } from "./shell";

const c = copy.meetings;
const af = c.after;

/** 第 5 步　會後：補決議、公開狀態、結案。 */
export function AfterStep({ m }: { m: MeetingFull }) {
  const key = meetingKey(m);
  const listed = m.proposals.filter((x) => x.reviewStatus !== "rejected");
  const missing = listed.filter((x) => !x.resolution?.trim()).length;

  return (
    <>
      <Block title={af.resolutionsTitle}>
        <p className="max-w-reader font-sans text-caption text-meta">{af.resolutionsLead}</p>
        {listed.length > 0 ? (
          <p className={`mt-2 font-sans text-caption ${missing > 0 ? "text-warn-ink" : "text-ink"}`}>
            {missing > 0 ? af.missing(missing) : af.allFilled}
          </p>
        ) : null}

        {listed.length === 0 ? (
          <p className="mt-3 font-sans text-body text-meta">{c.proposal.empty}</p>
        ) : (
          <ul className="mt-3 divide-y divide-line-soft border-y border-line-soft">
            {listed.map((x) => {
              const rule = ruleById(x.matterType);
              return (
                <li key={x.id} className="py-3">
                  <p className="font-sans text-caption text-meta">
                    附件{x.serialNo}・{x.section}
                  </p>
                  <p className="font-sans text-body text-ink">{x.title}</p>
                  <form action={updateProposalResolution} className="mt-2">
                    <input type="hidden" name="id" value={x.id} />
                    <label htmlFor={`res-${x.id}`} className="sr-only">
                      {c.proposal.resolution}
                    </label>
                    <textarea
                      id={`res-${x.id}`}
                      name="resolution"
                      rows={2}
                      defaultValue={x.resolution ?? ""}
                      placeholder={c.proposal.resolutionPlaceholder}
                      className="w-full rounded-sm border border-line bg-paper px-3.5 py-2.5 font-sans text-body text-ink placeholder:text-meta focus:border-accent"
                    />
                    <div className="mt-1.5 flex flex-wrap items-center gap-3">
                      <button type="submit" className={btn}>
                        {c.proposal.resolutionSave}
                      </button>
                    </div>
                  </form>
                  {rule ? (
                    <details className="mt-1.5">
                      <summary className={summaryCls}>{af.tallySummary}</summary>
                      <ProposalTally rule={rule} defaultPresent={m.livePresent} defaultTotal={m.liveTotal} />
                    </details>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
        <p className="mt-2 max-w-reader font-sans text-caption text-meta">{af.resolutionsLaw}</p>
      </Block>

      <Block title={af.publicTitle}>
        <p className="max-w-reader font-sans text-body text-ink">{m.isPublic ? c.info.publicOn : c.info.publicOff}</p>
        <a href={stepHref(key, "info")} className="mt-2 inline-block font-sans text-caption text-accent hover:underline">
          {af.publicGo} →
        </a>
      </Block>

      <Block title={af.closeTitle}>
        {m.status === "CLOSED" ? (
          <p className="font-sans text-body text-ink">{af.closed}</p>
        ) : (
          <form action={setMeetingStatus} className="flex flex-col items-start gap-2">
            <input type="hidden" name="id" value={m.id} />
            <input type="hidden" name="status" value="CLOSED" />
            <p className="font-sans text-caption text-meta">{af.closeHint}</p>
            <button type="submit" className={btnSolid}>
              {af.closeBtn}
            </button>
          </form>
        )}
      </Block>
    </>
  );
}
