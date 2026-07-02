import type { Metadata } from "next";
import { copy } from "@/lib/copy";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

// 幹部登入佔位：檢核與時程（幹部功能）於後續階段開放，登入機制屆時建置。
export const metadata: Metadata = {
  title: `${copy.login.title}｜${copy.home.org}${copy.home.sys}`,
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <>
      <SiteHeader />

      <main className="mx-auto flex min-h-[60vh] max-w-reader flex-col justify-center px-wrap-sm py-section-sm hero:px-wrap">
        <div className="font-ui text-eyebrow font-medium uppercase tracking-kicker text-accent">
          Officer
        </div>
        <h1 className="mt-3 font-serif text-h2">{copy.login.title}</h1>
        <p className="mt-4 font-sans text-lede text-lede-ink">{copy.login.body}</p>
        <div className="mt-8">
          <a href="/" className="font-sans text-body text-accent hover:underline">
            {copy.login.backHome}
          </a>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
