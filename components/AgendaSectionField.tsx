"use client";

import { useState } from "react";
import { copy } from "@/lib/copy";
import { citeOf, type VoteRule } from "@/lib/meetings/vote-rules";
import { evaluate, type Attendance } from "@/lib/meetings/tally";

const c = copy.meetings;

/**
 * 議程分節選單 + 該分節的法定表決方式提示。
 *
 * 只顯示規定、不做判斷：系統不知道本案屬於哪一類議案，也不計票、不判定通過與否。
 * 歸類與認定由承辦與主席為之（CLAUDE.md「人在迴路」）。
 * 每筆都附法規名與條號，引文為原文精確子字串（npm run verify:vote-rules 把關）。
 */
export function AgendaSectionField({
  rules,
  sections,
  defaultSection,
}: {
  rules: VoteRule[];
  sections: readonly string[];
  defaultSection: string;
}) {
  const [section, setSection] = useState(defaultSection);
  const [present, setPresent] = useState("");
  const [total, setTotal] = useState("");
  const hits = rules.filter((r) => r.sections.includes(section));

  const toN = (v: string) => {
    const n = Number.parseInt(v, 10);
    return Number.isFinite(n) && n > 0 ? n : undefined;
  };
  const attendance: Attendance = { present: toN(present), total: toN(total) };

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="p-section" className="font-sans text-caption font-medium text-ink">
          {c.proposal.section}
        </label>
        <select
          id="p-section"
          name="section"
          value={section}
          onChange={(e) => setSection(e.target.value)}
          className="w-full rounded-sm border border-line bg-paper px-3.5 py-2.5 font-sans text-body text-ink focus:border-accent"
        >
          {sections.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div className="hero:col-span-2">
        <details className="border border-line-soft bg-paper2">
          <summary className="cursor-pointer px-3 py-2 font-sans text-caption font-medium text-accent">
            {c.voteRule.heading}（{hits.length}）
          </summary>
          <div className="px-3 pb-3">
            <p className="mt-1 font-sans text-caption text-meta">{c.voteRule.intro}</p>

            {/* 門檻換算：填人數就換算成「需要幾票」。條文措辭有歧義者不換算。 */}
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 border-y border-line-soft py-2">
              <label htmlFor="tally-present" className="font-sans text-caption text-meta">
                {c.voteRule.present}
              </label>
              <input
                id="tally-present"
                type="number"
                min={0}
                inputMode="numeric"
                value={present}
                onChange={(e) => setPresent(e.target.value)}
                className="w-20 rounded-sm border border-line bg-paper px-2 py-1 font-sans text-caption text-ink focus:border-accent"
              />
              <label htmlFor="tally-total" className="font-sans text-caption text-meta">
                {c.voteRule.totalMembers}
              </label>
              <input
                id="tally-total"
                type="number"
                min={0}
                inputMode="numeric"
                value={total}
                onChange={(e) => setTotal(e.target.value)}
                className="w-20 rounded-sm border border-line bg-paper px-2 py-1 font-sans text-caption text-ink focus:border-accent"
              />
              <span className="font-sans text-caption text-meta">{c.voteRule.tallyHint}</span>
            </div>
            <p className="mt-1 font-sans text-caption text-meta">{c.voteRule.totalMembersConflict}</p>

            {hits.length === 0 ? (
              <p className="mt-2 font-sans text-caption text-meta">{c.voteRule.none}</p>
            ) : (
              <ul className="mt-2 flex flex-col gap-2.5">
                {hits.map((r) => (
                  <li key={r.id} className="border-l-2 border-line pl-2.5">
                    <p className="font-sans text-caption font-medium text-ink">{r.matter}</p>
                    <p className="mt-0.5 font-sans text-caption text-ink">
                      {c.voteRule.method}：{r.method ?? r.methodNote ?? c.voteRule.unspecified}
                    </p>
                    <p className="font-sans text-caption text-ink">
                      {c.voteRule.threshold}：{r.threshold ?? r.thresholdNote ?? c.voteRule.unspecified}
                    </p>
                    {(r.thresholdRules ?? []).map((t, i) => {
                      const o = evaluate(t, attendance);
                      return (
                        <p key={i} className="mt-0.5 font-sans text-caption">
                          {t.label ? <span className="text-meta">{t.label}　</span> : null}
                          {o.kind === "votes" ? (
                            <span className="text-ink">
                              {c.voteRule.need}
                              <strong className="tnum">{o.need}</strong>
                              {c.voteRule.votesOf(
                                o.base === "total" ? c.voteRule.totalMembers : c.voteRule.present,
                                o.of
                              )}
                            </span>
                          ) : o.kind === "missing" ? (
                            <span className="text-meta">
                              {c.voteRule.needInput(
                                o.base === "total" ? c.voteRule.totalMembers : c.voteRule.present
                              )}
                            </span>
                          ) : (
                            <span className="text-warn-ink">
                              {c.voteRule.cannotCompute}：{o.reason}
                            </span>
                          )}
                        </p>
                      );
                    })}
                    <p className="mt-0.5 font-ui text-chip text-meta">{citeOf(r)}</p>
                    <p className="mt-0.5 font-sans text-caption text-meta">「{r.quote}」</p>
                    {r.conflict ? (
                      <p className="mt-1 border border-warn-border bg-warn-surface px-2 py-1 font-sans text-caption text-warn-ink">
                        {c.voteRule.conflict}：{r.conflict}
                      </p>
                    ) : null}
                    {r.note ? (
                      <p className="mt-1 font-sans text-caption text-meta">※ {r.note}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-2.5 border-t border-line-soft pt-2 font-sans text-caption text-meta">
              {c.voteRule.disclaimer}
            </p>
          </div>
        </details>
      </div>
    </>
  );
}
