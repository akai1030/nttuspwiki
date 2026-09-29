"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { copy } from "@/lib/copy";
import { castVote } from "@/app/v/[token]/actions";

const c = copy.meetings.vote.member;

/**
 * 議員的選票。先選、再確認、才送出：手機上誤觸的機會很高，而送出後不能改。
 * 不想表態可以直接不投（出席未投＝廢票），所以沒有「棄權」鈕。
 */
export function BallotForm({
  token,
  voteId,
  options,
}: {
  token: string;
  voteId: string;
  options: { id: string; label: string }[];
}) {
  const router = useRouter();
  const [picked, setPicked] = useState<{ id: string; label: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit() {
    if (!picked) return;
    setError(null);
    start(async () => {
      try {
        const r = await castVote(token, voteId, picked.id);
        if (!r.ok) setError(c.errors[r.error] ?? c.errors.network);
      } catch {
        setError(c.errors.network);
        return;
      }
      router.refresh();
    });
  }

  if (picked) {
    return (
      <div className="border border-accent bg-paper p-card">
        <p className="font-sans text-body font-medium text-ink">{c.confirm(picked.label)}</p>
        <div className="mt-3 flex flex-wrap gap-2.5">
          <button
            type="button"
            onClick={submit}
            disabled={pending}
            className="min-h-12 flex-1 border border-ink bg-ink px-5 font-ui text-body font-medium text-white transition-colors hover:border-accent hover:bg-accent disabled:opacity-60"
          >
            {pending ? c.sending : c.submit}
          </button>
          <button
            type="button"
            onClick={() => setPicked(null)}
            disabled={pending}
            className="min-h-12 border border-line px-5 font-ui text-body text-ink transition-colors hover:border-accent hover:text-accent disabled:opacity-60"
          >
            {c.back}
          </button>
        </div>
        {error ? (
          <p role="alert" className="mt-2.5 font-sans text-caption text-warn-ink">
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <fieldset>
      <legend className="font-sans text-caption text-meta">{c.pick}</legend>
      <div className="mt-2 flex flex-col gap-2.5">
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => setPicked(o)}
            className="min-h-14 border border-line bg-paper px-4 text-left font-sans text-h4 text-ink transition-colors hover:border-accent hover:text-accent"
          >
            {o.label}
          </button>
        ))}
      </div>
      <p className="mt-2.5 font-sans text-caption text-meta">{c.abstainNote}</p>
      {error ? (
        <p role="alert" className="mt-2 font-sans text-caption text-warn-ink">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
