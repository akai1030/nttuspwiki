"use client";

import { useActionState } from "react";
import { copy } from "@/lib/copy";
import { voterLogin, type VoterLoginState } from "@/app/vote/actions";
import { Input } from "@/components/SearchBox";

const c = copy.meetings.vote.lobby;

/** 議員投票登入：學號＋手機末四碼。成功後伺服器設 cookie 並導回 /vote。 */
export function VoterLoginForm() {
  const [state, action, pending] = useActionState<VoterLoginState, FormData>(voterLogin, null);
  return (
    <form action={action} className="mt-6 flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="voter-sid" className="font-sans text-caption font-medium text-ink">
          {c.studentId}
        </label>
        <Input
          id="voter-sid"
          name="studentId"
          required
          defaultValue={state?.studentId ?? ""}
          autoComplete="username"
          autoCapitalize="characters"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="voter-phone4" className="font-sans text-caption font-medium text-ink">
          {c.phone4}
        </label>
        <Input
          id="voter-phone4"
          name="phone4"
          required
          inputMode="numeric"
          pattern="[0-9]{4}"
          maxLength={4}
          autoComplete="off"
        />
      </div>
      {state?.error ? (
        <p role="alert" className="font-sans text-caption text-warn-ink">
          {state.error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="min-h-12 border border-ink bg-ink px-5 font-ui text-body font-medium text-white transition-colors hover:border-accent hover:bg-accent disabled:opacity-60"
      >
        {c.submit}
      </button>
    </form>
  );
}
