import { copy } from "@/lib/copy";
import { Button } from "@/components/Button";

// Phase 1 佔位首頁：完整 hero/索引在 Phase 3（見 PROMPTS.md）。此處僅確認 tokens/元件可運作。
export default function Home() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-wrap flex-col justify-center px-wrap-sm py-section-sm hero:px-wrap hero:py-section">
      <div className="font-ui text-eyebrow font-medium uppercase tracking-kicker text-accent">
        {copy.home.kicker}
      </div>
      <h1 className="mt-4 font-serif">
        <span className="block text-hero-org">{copy.home.org}</span>
        <span className="block text-hero-sys">{copy.home.sys}</span>
      </h1>
      <p className="mt-6 max-w-reader font-sans text-lede text-lede-ink">{copy.home.lede}</p>
      <div className="mt-8">
        <Button variant="outline" href="/styleguide">
          Design System · 書院光 →
        </Button>
      </div>
    </main>
  );
}
