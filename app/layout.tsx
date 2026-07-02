import type { Metadata } from "next";
import { copy } from "@/lib/copy";
// tokens 先於 globals 載入，確保 :root 變數在 Tailwind base 之前就緒。
import "@/styles/tokens.css";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: copy.site.title,
  description: copy.site.description,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-Hant">
      <body>
        {/*
          字體走 Google Fonts CDN（非 next/font）。理由：Noto Serif/Sans TC 是 CJK 大字檔，
          CDN 的 unicode-range 動態切片只載入實際用到的字塊，遠優於 next/font 對 CJK 的整檔自帶。
          Phase 6 QA 再評估 preload / 自架最佳化。React 會把這些 <link> 提升到 <head>。
        */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* App Router 的 root layout 會套用到每一頁，no-page-custom-font 規則的前提（只載入單頁）在此不成立。 */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Geist+Mono:wght@400;500&family=Noto+Serif+TC:wght@400;500;600;700;900&family=Noto+Sans+TC:wght@400;500;700&family=Space+Grotesk:wght@400;500;600;700&display=swap"
        />
        {children}
      </body>
    </html>
  );
}
