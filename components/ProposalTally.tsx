"use client";

import { useState } from "react";
import { copy } from "@/lib/copy";
import { citeOf, type VoteRule } from "@/lib/meetings/vote-rules";
import { evaluate, type Attendance } from "@/lib/meetings/tally";

const c = copy.meetings;

/**
 * 會中用的門檻換算：填出席人數，算出這一案需要幾票。
 *
 * 為什麼在這裡而不在「新增提案」表單：出席人數要到會議開始、點名完才知道，
 * 擬案時填不出來。議案類型則相反——擬案時就該定好，所以存在 Proposal.matterType。
 *
 * 系統只算「依這條文字需要幾票」，不收實際票數、不宣告通過與否。
 * 條文措辭無法機械判定者（如光桿的「三分之二」）一律回報無法換算並附原文。
 */
export function ProposalTally({
  rule,
  defaultPresent,
  defaultTotal,
}: {
  rule: VoteRule;
  /** 現場議事台已登記的點名數字，帶進來當預設，不必再填一次。 */
  defaultPresent?: number | null;
  defaultTotal?: number | null;
}) {
  const [present, setPresent] = useState(defaultPresent != null ? String(defaultPresent) : "");
  const [total, setTotal] = useState(defaultTotal != null ? String(defaultTotal) : "");

  const toN = (v: string) => {
    const n = Number.parseInt(v, 10);
    return Number.isFinite(n) && n > 0 ? n : undefined;
  };
  const attendance: Attendance = { present: toN(present), total: toN(total) };
  const tr = rule.thresholdRules ?? [];
  const needsTotal = tr.some((t) => t.base === "total");

  return (
    <div className="mt-1.5">
      <p className="font-sans text-caption text-ink">
        <span className="text-meta">{c.voteRule.method}：</span>
        {rule.method ?? rule.methodNote ?? c.voteRule.unspecified}
        <span className="mx-1.5 text-line">·</span>
        <span className="text-meta">{c.voteRule.threshold}：</span>
        {rule.threshold ?? rule.thresholdNote ?? c.voteRule.unspecified}
      </p>
      <p className="mt-0.5 font-ui text-chip text-meta">{citeOf(rule)}</p>

      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <label className="font-sans text-caption text-meta">
          {c.voteRule.present}
          <input
            type="number"
            min={0}
            inputMode="numeric"
            value={present}
            onChange={(e) => setPresent(e.target.value)}
            className="ml-1.5 w-20 rounded-sm border border-line bg-paper px-2 py-1 font-sans text-caption text-ink focus:border-accent"
          />
        </label>
        {needsTotal ? (
          <label className="font-sans text-caption text-meta">
            {c.voteRule.totalMembers}
            <input
              type="number"
              min={0}
              inputMode="numeric"
              value={total}
              onChange={(e) => setTotal(e.target.value)}
              className="ml-1.5 w-20 rounded-sm border border-line bg-paper px-2 py-1 font-sans text-caption text-ink focus:border-accent"
            />
          </label>
        ) : null}
        <span className="font-sans text-caption text-meta">{c.voteRule.tallyHint}</span>
      </div>

      {tr.map((t, i) => {
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

      {needsTotal ? (
        <p className="mt-1 font-sans text-caption text-meta">{c.voteRule.totalMembersConflict}</p>
      ) : null}
      {rule.conflict ? (
        <p className="mt-1 border border-warn-border bg-warn-surface px-2 py-1 font-sans text-caption text-warn-ink">
          {c.voteRule.conflict}：{rule.conflict}
        </p>
      ) : null}
    </div>
  );
}
