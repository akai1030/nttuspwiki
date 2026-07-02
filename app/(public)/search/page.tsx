import type { Metadata } from "next";
import type { ReactNode } from "react";
import { copy } from "@/lib/copy";
import { cn } from "@/lib/cn";
import { searchArticles, type SearchMode } from "@/lib/search/query";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { SearchBox } from "@/components/SearchBox";

// 檢索用 jieba（native）+ 語意向量，需 Node runtime、逐次動態執行（非預生成）。零 API 費、離線。
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `${copy.searchPage.title}｜${copy.home.org}${copy.home.sys}`,
  description: copy.searchPage.emptyPrompt,
};

const MODES: SearchMode[] = ["hybrid", "keyword", "semantic"];

/** 命中詞以 accent 標色（不改原字、React 自動轉義，無 XSS）。 */
function highlight(snippet: string, matched: string[]): ReactNode {
  const terms = matched.map((m) => m.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).filter(Boolean);
  if (terms.length === 0) return snippet;
  const re = new RegExp(`(${terms.join("|")})`, "g");
  return snippet.split(re).map((p, i) =>
    matched.includes(p) ? (
      <mark key={i} className="bg-transparent font-medium text-accent">
        {p}
      </mark>
    ) : (
      <span key={i}>{p}</span>
    )
  );
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: { q?: string; mode?: string };
}) {
  const q = (searchParams.q ?? "").trim();
  const mode: SearchMode = MODES.includes(searchParams.mode as SearchMode)
    ? (searchParams.mode as SearchMode)
    : "hybrid";

  // 語意層（e5 模型載入）若在部署環境失敗，退回免費關鍵字層（永遠可用、零 token）；
  // 關鍵字層也失敗才顯示錯誤。免費規則層不依賴任何付費/外部服務（CLAUDE.md 免費優先）。
  let result: Awaited<ReturnType<typeof searchArticles>> | null = null;
  let degraded = false;
  let searchError = false;
  if (q) {
    try {
      result = await searchArticles(q, 30, mode);
    } catch {
      if (mode !== "keyword") {
        try {
          result = await searchArticles(q, 30, "keyword");
          degraded = true;
        } catch {
          searchError = true;
        }
      } else {
        searchError = true;
      }
    }
  }

  return (
    <>
      <SiteHeader />

      <main className="mx-auto max-w-wrap px-wrap-sm py-section-sm hero:px-wrap hero:py-section">
        <header className="mb-8 border-b-2 border-ink pb-8">
          <div className="font-ui text-eyebrow font-medium uppercase tracking-kicker text-accent">
            {copy.searchPage.en}
          </div>
          <h1 className="mt-3 font-serif text-h2">{copy.searchPage.title}</h1>
        </header>

        <div className="max-w-reader">
          <SearchBox defaultValue={q} />
        </div>

        {/* 檢索模式切換（保留 q） */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {MODES.map((m) => {
            const on = m === mode;
            return (
              <a
                key={m}
                href={`/search?q=${encodeURIComponent(q)}&mode=${m}`}
                aria-current={on ? "true" : undefined}
                className={cn(
                  "border px-3 py-[5px] font-sans text-caption leading-none transition-colors",
                  on
                    ? "border-accent bg-accent text-white"
                    : "border-line text-meta hover:border-accent hover:text-accent"
                )}
              >
                {copy.searchPage.modes[m]}
              </a>
            );
          })}
          <span className="ml-1 font-sans text-caption text-meta">{copy.searchPage.modeHint[mode]}</span>
        </div>

        {/* 結果 */}
        <div className="mt-10">
          {!q ? (
            <p className="font-sans text-lede text-lede-ink">{copy.searchPage.emptyPrompt}</p>
          ) : searchError ? (
            <p className="font-sans text-lede text-lede-ink">{copy.searchPage.error}</p>
          ) : result && result.hits.length > 0 ? (
            <>
              {degraded && (
                <p className="mb-4 border-l-2 border-l-accent2 pl-3 font-sans text-caption text-meta">
                  {copy.searchPage.degraded}
                </p>
              )}
              <div className="mb-6 flex flex-wrap items-baseline gap-x-3 gap-y-1.5">
                <span className="font-sans text-body text-ink">
                  {copy.searchPage.resultCount(result.hits.length)}
                </span>
                {result.tokens.length > 0 && (
                  <span className="font-sans text-caption text-meta">
                    {copy.searchPage.tokensLabel}：{result.tokens.join(" · ")}
                  </span>
                )}
              </div>

              <div>
                {result.hits.map((hit) => (
                  <a
                    key={`${hit.lawNumber}-${hit.articleNumber}`}
                    href={`/law/${hit.lawNumber}#art-${hit.articleNumber}`}
                    className="-mx-2.5 block border-b border-line-soft px-2.5 py-5 transition-colors hover:bg-paper2"
                  >
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="font-mono text-code font-medium text-accent tnum">
                        {hit.lawNumber} §{hit.articleNumber}
                      </span>
                      <span className="font-sans text-caption text-meta">{hit.category}</span>
                    </div>
                    <div className="mt-1.5 font-serif text-art-name text-ink">
                      {hit.lawName}
                      {hit.articleName ? <span className="text-meta"> · {hit.articleName}</span> : null}
                    </div>
                    <p className="mt-1.5 font-serif text-body leading-relaxed text-body-ink">
                      {highlight(hit.snippet, hit.matched)}
                    </p>
                  </a>
                ))}
              </div>
            </>
          ) : (
            <p className="font-sans text-lede text-lede-ink">{copy.searchPage.noResults}</p>
          )}
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
