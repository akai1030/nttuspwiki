"use client";

import { useState } from "react";
import { copy } from "@/lib/copy";

/** 複製按鈕（把 text 寫入剪貼簿）。 */
export function CopyButton({ text, label }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  async function onCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setDone(true);
      window.setTimeout(() => setDone(false), 1500);
    } catch {
      /* 剪貼簿不可用時靜默略過 */
    }
  }
  return (
    <button
      type="button"
      onClick={onCopy}
      className="border border-line px-3 py-1.5 font-ui text-caption font-medium leading-none tracking-snug text-ink transition-colors hover:border-accent hover:text-accent"
    >
      {done ? copy.meetings.copied : label ?? copy.meetings.copy}
    </button>
  );
}

/** 文字區塊 + 複製鈕（議程、通知內文等）。 */
export function CopyBlock({ text, label }: { text: string; label?: string }) {
  return (
    <div className="border border-line bg-paper2">
      <div className="flex items-center justify-between border-b border-line-soft px-3 py-2">
        <span className="font-ui text-caption text-meta">{label ?? ""}</span>
        <CopyButton text={text} label={copy.meetings.copy} />
      </div>
      <pre className="max-h-[28rem] overflow-auto whitespace-pre-wrap break-words px-4 py-3 font-sans text-body leading-relaxed text-ink">
        {text}
      </pre>
    </div>
  );
}
