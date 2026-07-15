import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { copy } from "@/lib/copy";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { LoginForm } from "@/components/LoginForm";
import { readSession } from "@/lib/auth/session";

// 讀 session cookie → force-dynamic（build 期無需連 DB）。
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `${copy.login.title}｜${copy.home.org}${copy.home.sys}`,
  robots: { index: false, follow: false },
};

// next 只接受站內相對路徑，擋開放重導（//evil、https://…）。
function safeNext(next?: string): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return "/console";
  return next;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: { next?: string };
}) {
  const next = safeNext(searchParams?.next);

  // 已登入就直接進目的地，不用再看登入頁。
  const session = await readSession();
  if (session) redirect(next);

  return (
    <>
      <SiteHeader />

      <main className="mx-auto flex min-h-[60vh] max-w-reader flex-col justify-center px-wrap-sm py-section-sm hero:px-wrap">
        <div className="font-ui text-eyebrow font-medium uppercase tracking-kicker text-accent">
          Officer
        </div>
        <h1 className="mt-3 font-serif text-h2">{copy.login.title}</h1>
        <p className="mt-4 font-sans text-lede text-lede-ink">{copy.login.body}</p>

        <div className="mt-2 max-w-[26rem]">
          <LoginForm next={next} />
        </div>

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
