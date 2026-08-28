"use client";

import { useState } from "react";
import { copy } from "@/lib/copy";
import { citeOf, type VoteRule } from "@/lib/meetings/vote-rules";

const c = copy.meetings;

/**
 * 新增提案用的兩個選單：議程分節 + 議案類型。
 *
 * 議案類型要「選了才出那一條」——同一個分節可能對應十條規定，
 * 全部攤開等於沒提示。選定後只顯示該類議案的法定表決方式、門檻與法源原文。
 *
 * 這裡刻意**不做門檻換算**：出席人數要到會中才知道，擬案時填不出來。
 * 換算在每筆提案的決議區（components/ProposalTally.tsx）。
 *
 * 系統不判斷本案屬於哪一類——歸類是承辦與主席的事（CLAUDE.md「人在迴路」）。
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
  const [matterType, setMatterType] = useState("");

  const options = rules.filter((r) => r.sections.includes(section));
  const picked = options.find((r) => r.id === matterType) ?? null;

  function onSection(next: string) {
    setSection(next);
    // 換分節後原本選的類型可能不適用了，清掉而不是留著誤導。
    if (!rules.some((r) => r.id === matterType && r.sections.includes(next))) setMatterType("");
  }

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
          onChange={(e) => onSection(e.target.value)}
          className="w-full rounded-sm border border-line bg-paper px-3.5 py-2.5 font-sans text-body text-ink focus:border-accent"
        >
          {sections.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="p-matter" className="font-sans text-caption font-medium text-ink">
          {c.proposal.matterType}
        </label>
        <select
          id="p-matter"
          name="matterType"
          value={matterType}
          onChange={(e) => setMatterType(e.target.value)}
          className="w-full rounded-sm border border-line bg-paper px-3.5 py-2.5 font-sans text-body text-ink focus:border-accent"
        >
          <option value="">{c.proposal.matterTypeNone}</option>
          {options.map((r) => (
            <option key={r.id} value={r.id}>
              {r.matter}
            </option>
          ))}
        </select>
      </div>

      <div className="hero:col-span-2">
        {picked ? (
          <div className="border border-line-soft bg-paper2 px-3 py-2.5">
            <p className="font-sans text-caption font-medium text-accent">{c.voteRule.heading}</p>
            <div className="mt-2">
              <VoteRuleBody rule={picked} />
            </div>
            <p className="mt-2.5 border-t border-line-soft pt-2 font-sans text-caption text-meta">
              {c.voteRule.tallyLater}
            </p>
            <p className="mt-1 font-sans text-caption text-meta">{c.voteRule.disclaimer}</p>
          </div>
        ) : (
          <p className="font-sans text-caption text-meta">
            {options.length === 0 ? c.voteRule.none : c.proposal.matterTypeHint}
          </p>
        )}
      </div>
    </>
  );
}

/** 與 components/VoteRuleCard.tsx 同一份版式；此處為 client 用的複本。 */
function VoteRuleBody({ rule }: { rule: VoteRule }) {
  return (
    <div className="border-l-2 border-line pl-2.5">
      <p className="font-sans text-caption text-ink">
        {c.voteRule.method}：{rule.method ?? rule.methodNote ?? c.voteRule.unspecified}
      </p>
      <p className="font-sans text-caption text-ink">
        {c.voteRule.threshold}：{rule.threshold ?? rule.thresholdNote ?? c.voteRule.unspecified}
      </p>
      <p className="mt-0.5 font-ui text-chip text-meta">{citeOf(rule)}</p>
      <p className="mt-0.5 font-sans text-caption text-meta">「{rule.quote}」</p>
      {rule.conflict ? (
        <p className="mt-1 border border-warn-border bg-warn-surface px-2 py-1 font-sans text-caption text-warn-ink">
          {c.voteRule.conflict}：{rule.conflict}
        </p>
      ) : null}
      {rule.note ? <p className="mt-1 font-sans text-caption text-meta">※ {rule.note}</p> : null}
    </div>
  );
}
