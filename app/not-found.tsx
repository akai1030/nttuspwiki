import type { Metadata } from "next";
import { copy } from "@/lib/copy";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

const t = copy.notFound;

export const metadata: Metadata = {
  title: `${t.title}｜${copy.home.org}${copy.home.sys}`,
  robots: { index: false, follow: false },
};

/**
 * 全站的找不到頁面：沒對到任何路由的網址，以及頁面裡呼叫 notFound()（不存在的法規編號、會議）。
 * 沒有這個檔時 Next 會給內建的英文 404，沒有站內導覽，動態頁甚至連 <html lang> 都沒有。
 * 純靜態、不連 DB，資料庫掛了也顯示得出來。版面照 /updates。
 */
export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-reader px-wrap-sm py-section-sm hero:px-wrap hero:py-section">
        <div className="font-ui text-chip font-medium tnum text-meta">404</div>
        <h1 className="mt-3 font-serif text-h2">{t.title}</h1>
        <p className="mt-4 font-sans text-lede text-lede-ink">{t.body}</p>
        <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 font-sans text-body">
          <li>
            <a href="/law" className="text-accent hover:underline">
              {t.toLaw}
            </a>
          </li>
          <li>
            <a href="/search" className="text-accent hover:underline">
              {t.toSearch}
            </a>
          </li>
          <li>
            <a href="/" className="text-accent hover:underline">
              {t.toHome}
            </a>
          </li>
        </ul>
      </main>
      <SiteFooter />
    </>
  );
}
