"use client";

import { useState } from "react";

/**
 * CopyCite — 條文 hover 顯示的「複製引用」（DESIGN-SYSTEM §4：每條 hover 顯示複製引用/永久連結）。
 * 唯一的 client 元件；複製「法規名 §條號」到剪貼簿。焦點時亦顯示（鍵盤可達）。
 * 父層 <article> 需帶 group/art，才能在 hover 浮現。
 */
export function CopyCite({ cite }: { cite: string }) {
  const [done, setDone] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(cite);
      setDone(true);
      window.setTimeout(() => setDone(false), 1500);
    } catch {
      /* 剪貼簿不可用時靜默略過（不擋閱讀） */
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={`複製引用：${cite}`}
      className="font-sans text-caption leading-none text-meta opacity-0 transition-opacity hover:text-accent focus-visible:opacity-100 group-hover/art:opacity-100"
    >
      {done ? "已複製" : "⧉ 複製"}
    </button>
  );
}
