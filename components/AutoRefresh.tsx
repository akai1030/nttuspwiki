"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * 定時重新抓伺服器狀態。
 *
 * 刻意用 polling 而不是 SSE／WebSocket：
 * 這是一個月開一兩次、幾十人看的會議頁，長連線的維運成本與 Zeabur 上的
 * 連線數限制都不值得，而 router.refresh() 走的是既有的 force-dynamic 路徑，
 * 零新端點、零新相依（CLAUDE.md「免費優先」）。
 *
 * 重要：這個元件**只負責重新讀取**，不推進任何狀態。
 * 議程進到哪一案、開不開放，一律由主席／祕書在中控台按下去才會變
 * （既有紀律：現場工具人工操控，伺服器存狀態、畫面只跟隨）。
 */
export function AutoRefresh({ seconds = 5 }: { seconds?: number }) {
  const router = useRouter();
  const [on, setOn] = useState(true);

  useEffect(() => {
    if (!on) return;
    const id = window.setInterval(() => router.refresh(), Math.max(2, seconds) * 1000);
    return () => window.clearInterval(id);
  }, [on, seconds, router]);

  return (
    <label className="flex items-center gap-1.5 font-sans text-caption text-meta">
      <input type="checkbox" checked={on} onChange={(e) => setOn(e.target.checked)} />
      每 {seconds} 秒自動更新
    </label>
  );
}
