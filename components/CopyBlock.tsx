"use client";

import { useState } from "react";
import { copy } from "@/lib/copy";
import { copyRich, type CopyResult } from "@/lib/clipboard";

/**
 * 複製按鈕。
 * 只給 text → 純文字複製（與改版前行為相同，既有呼叫點不受影響）。
 * 另給 html → 同時寫入 text/html，貼進 Gmail 撰寫視窗會保留格式。
 */
export function CopyButton({ text, html, label }: { text: string; html?: string; label?: string }) {
  const [state, setState] = useState<CopyResult | null>(null);

  async function onCopy() {
    const r = await copyRich(text, html);
    setState(r);
    // 失敗要留久一點讓人看得到，並由旁邊的「純文字」鈕接手。
    window.setTimeout(() => setState(null), r === "failed" ? 4000 : 1500);
  }

  const shown =
    state === null
      ? (label ?? copy.meetings.copy)
      : state === "failed"
        ? copy.meetings.copyFailed
        : state === "rich"
          ? copy.meetings.copiedRich
          : copy.meetings.copied;

  return (
    <button
      type="button"
      onClick={onCopy}
      aria-live="polite"
      className={`border px-3 py-1.5 font-ui text-caption font-medium leading-none tracking-snug transition-colors ${
        state === "failed"
          ? "border-warn-border text-warn-ink"
          : "border-line text-ink hover:border-accent hover:text-accent"
      }`}
    >
      {shown}
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
