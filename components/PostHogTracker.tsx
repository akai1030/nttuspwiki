"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { syncPostHog } from "@/lib/posthog";

/**
 * 放在根版面。什麼時候啟用、哪些路徑不記，見 lib/posthog.ts。
 * 全站用 <a> 整頁換頁，多半一頁只跑一次；表單送出後的轉址會在同一頁換路徑，這裡跟著重判。
 */
export function PostHogTracker() {
  const pathname = usePathname();
  useEffect(() => {
    if (pathname) syncPostHog(pathname);
  }, [pathname]);
  return null;
}
