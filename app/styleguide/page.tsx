import type { Metadata } from "next";
import type { ReactNode } from "react";
import { copy } from "@/lib/copy";
import { CATEGORY_ORDER } from "@/lib/categories";
import { Button } from "@/components/Button";
import { SearchBox, Input } from "@/components/SearchBox";
import { CategoryTag, CategoryRow, Tag, Chip } from "@/components/Tag";
import { Card } from "@/components/Card";
import { LawRow } from "@/components/LawRow";
import { SectionHead } from "@/components/SectionHead";
import { ArticleBlock, Xref } from "@/components/ArticleBlock";
import { AmendmentTimeline } from "@/components/AmendmentTimeline";
import {
  SAMPLE_ROWS,
  CATEGORY_COUNTS,
  SAMPLE_ARTICLE_ITEMS,
  SAMPLE_ARTICLE_BODY,
  SAMPLE_ARTICLE_15,
  SAMPLE_ARTICLE_XREF,
  SAMPLE_AMENDMENTS,
  SAMPLE_AMENDMENT_COUNT,
} from "./fixtures";

export const metadata: Metadata = {
  title: "Styleguide · 書院光 · 國立臺東大學學生會法規系統",
  robots: { index: false, follow: false },
};

/* ── 頁內小工具（僅供本頁展示）───────────────────────── */

function Swatch({
  swatch,
  name,
  value,
  note,
  dark = false,
}: {
  swatch: string;
  name: string;
  value: string;
  note?: string;
  dark?: boolean;
}) {
  return (
    <div className="border border-line">
      <div
        className={`flex h-16 items-end p-2 ${swatch} ${
          dark ? "text-white" : "text-ink"
        }`}
      >
        <span className="font-mono text-[11px] tnum">{value}</span>
      </div>
      <div className="px-2 py-1.5">
        <div className="font-mono text-[11px] text-ink tnum">{name}</div>
        {note && <div className="font-sans text-[11px] text-meta">{note}</div>}
      </div>
    </div>
  );
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mb-10">
      <h3 className="mb-4 font-ui text-eyebrow font-medium uppercase tracking-eyebrow text-meta">
        {title}
      </h3>
      {children}
    </div>
  );
}

function TypeSpec({
  cls,
  label,
  sample,
}: {
  cls: string;
  label: string;
  sample: string;
}) {
  return (
    <div className="flex flex-wrap items-baseline gap-4 border-b border-line-soft py-4">
      <span className="w-40 shrink-0 font-mono text-[11px] text-meta tnum">
        {label}
      </span>
      <span className={cls}>{sample}</span>
    </div>
  );
}

/* ── 頁面 ───────────────────────────────────────────── */

export default function Styleguide() {
  return (
    <main className="mx-auto max-w-wrap px-wrap-sm py-section-sm hero:px-wrap hero:py-section">
      {/* 標頭 */}
      <header className="mb-16 border-b-2 border-ink pb-8">
        <div className="font-ui text-eyebrow font-medium uppercase tracking-kicker text-accent">
          Design System · 書院光 · v1.0
        </div>
        <h1 className="mt-3 font-serif text-h2">{copy.nav.brand}</h1>
        <p className="mt-4 max-w-reader font-sans text-lede text-lede-ink">
          Phase 1 設計 tokens 與基礎元件展示頁。所有色彩／字級／間距皆取自{" "}
          <code className="font-mono text-code text-accent">styles/tokens.css</code>
          ，元件不硬編（CLAUDE.md 設計不漂移）。
        </p>
      </header>

      {/* 1 · 色彩 */}
      <section className="mb-24">
        <SectionHead no="01" title="色彩" en="Color" />

        <Block title="基底面 Base">
          <div className="grid grid-cols-2 gap-3 hero:grid-cols-4">
            <Swatch swatch="bg-ink" name="--ink" value="#17181C" dark note="主文字" />
            <Swatch swatch="bg-paper" name="--paper" value="#FBFAF6" note="頁面底" />
            <Swatch swatch="bg-paper2" name="--paper2" value="#F1EFE7" note="次級面" />
            <Swatch swatch="bg-cloud" name="--cloud" value="#E8E9E4" note="淡分隔" />
          </div>
        </Block>

        <Block title="強調 Accent（唯一主色：靛藍）">
          <div className="grid grid-cols-2 gap-3 hero:grid-cols-4">
            <Swatch swatch="bg-accent" name="--accent" value="#243FB5" dark note="連結/主按鈕" />
            <Swatch swatch="bg-accent-soft" name="--accent-soft" value="#3B54C8" dark note="hover" />
            <Swatch swatch="bg-accent2" name="--accent2" value="#C7442E" dark note="警示/沿革" />
          </div>
        </Block>

        <Block title="文字階層 Text">
          <div className="grid grid-cols-2 gap-3 hero:grid-cols-4">
            <Swatch swatch="bg-muted" name="--muted" value="#807F78" dark note="≥16px 才可用" />
            <Swatch swatch="bg-meta" name="--meta" value="#5C5B54" dark note="小字專用" />
          </div>
        </Block>

        <Block title="五類分類識別色 Category（只用於分類標籤）">
          <div className="grid grid-cols-2 gap-3 hero:grid-cols-5">
            <Swatch swatch="bg-cat-charter" name="--cat-charter" value="#243FB5" dark note="最高章程" />
            <Swatch swatch="bg-cat-legis" name="--cat-legis" value="#17181C" dark note="立法" />
            <Swatch swatch="bg-cat-exec" name="--cat-exec" value="#C7442E" dark note="行政" />
            <Swatch swatch="bg-cat-judic" name="--cat-judic" value="#5B3E9B" dark note="司法" />
            <Swatch swatch="bg-cat-elect" name="--cat-elect" value="#1F7A54" dark note="選舉" />
          </div>
        </Block>

        <Block title="語意與表面 Semantic / Surface">
          <div className="grid grid-cols-2 gap-3 hero:grid-cols-4">
            <Swatch swatch="bg-ok" name="--ok / --sch" value="#0F6E56" dark note="通過/時程" />
            <Swatch swatch="bg-warn" name="--warn" value="#993C1D" dark note="警示" />
            <Swatch swatch="bg-ref-surface" name="--ref-surface" value="#F4F6FF" note="參照卡底" />
            <Swatch swatch="bg-warn-surface" name="--warn-surface" value="#FDEEE9" note="疑慮 pill 底" />
          </div>
        </Block>
      </section>

      {/* 2 · 字體與字級 */}
      <section className="mb-24">
        <SectionHead no="02" title="字體與字級" en="Type" />

        <Block title="四種字族 Families">
          <div className="grid grid-cols-1 gap-4 hero:grid-cols-2">
            <div className="border border-line p-5">
              <div className="font-mono text-[11px] text-meta tnum">--serif · Noto Serif TC</div>
              <div className="mt-2 font-serif text-[22px]">法條正文．明體撐骨</div>
            </div>
            <div className="border border-line p-5">
              <div className="font-mono text-[11px] text-meta tnum">--sans · Noto Sans TC</div>
              <div className="mt-2 font-sans text-[22px]">中文 UI 與小字．黑體操作</div>
            </div>
            <div className="border border-line p-5">
              <div className="font-mono text-[11px] text-meta tnum">--ui · Space Grotesk</div>
              <div className="mt-2 font-ui text-[22px]">Numerals &amp; Labels 0123456789</div>
            </div>
            <div className="border border-line p-5">
              <div className="font-mono text-[11px] text-meta tnum">--mono · Geist Mono</div>
              <div className="mt-2 font-mono text-[22px] tnum">§16　113.09.19　0.0</div>
            </div>
          </div>
        </Block>

        <Block title="字級階層 Scale">
          <div>
            <TypeSpec cls="font-serif text-hero-org" label="hero-org · serif 700" sample="國立臺東大學學生會" />
            <TypeSpec cls="font-ui text-hero-en stroke-text" label="hero-en · ui 700 外框" sample="STUDENT CODEX" />
            <TypeSpec cls="font-serif text-h2" label="h2 · serif 700" sample="法規總覽" />
            <TypeSpec cls="font-serif text-law-title" label="law-title · serif 900" sample="學生議會組織及實行準則" />
            <TypeSpec cls="font-serif text-art-name" label="art-name · serif 600" sample="會議之種類" />
            <TypeSpec cls="font-serif text-art-body text-body-ink" label="art-body · serif 400 / 2.05" sample="一屆任期即為完整之會期，自七月一日起至隔年六月三十日止。" />
            <TypeSpec cls="font-sans text-lede text-lede-ink" label="lede · sans 400 / 1.9" sample="整理成一部查得到、讀得懂、對照得起來的數位法典。" />
            <TypeSpec cls="font-sans text-caption text-meta tnum" label="caption(meta) · sans 400" sample="60 條 · 修正 2024·09·19 · 母法" />
            <TypeSpec cls="font-ui text-eyebrow font-medium uppercase tracking-eyebrow text-meta" label="eyebrow · ui 500 uppercase" sample="Index" />
            <TypeSpec cls="font-mono text-code text-accent tnum" label="code · mono 500" sample="§8　準用　113.06.06" />
            <TypeSpec cls="font-ui text-bignum text-ink tnum" label="bignum · ui 700" sample="768" />
          </div>
        </Block>
      </section>

      {/* 3 · 間距 */}
      <section className="mb-24">
        <SectionHead no="03" title="間距與容器" en="Spacing" />
        <div className="space-y-3">
          {[
            ["--sp-section", "118px", "w-section"],
            ["--sp-section-sm", "60px", "w-section-sm"],
            ["--sp-wrap-pad", "44px", "w-wrap"],
            ["--sp-card", "30px", "w-card"],
          ].map(([name, val, w]) => (
            <div key={name} className="flex items-center gap-4">
              <span className="w-40 shrink-0 font-mono text-[11px] text-meta tnum">{name}</span>
              <span className={`${w} h-4 bg-accent`} />
              <span className="font-mono text-[11px] text-meta tnum">{val}</span>
            </div>
          ))}
        </div>
      </section>

      {/* 4 · 元件 */}
      <section className="mb-24">
        <SectionHead no="04" title="基礎元件" en="Components" />

        <Block title="Button">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary">主要按鈕</Button>
            <Button variant="ink">墨色按鈕</Button>
            <Button variant="outline">外框按鈕</Button>
            <Button variant="outline" href="#">{copy.nav.login}</Button>
          </div>
        </Block>

        <Block title="Input / SearchBox">
          <div className="max-w-reader space-y-4">
            <SearchBox action="#" />
            <Input placeholder="一般輸入框 Input" aria-label="範例輸入框" />
          </div>
        </Block>

        <Block title="Tag · 分類標籤 CategoryTag">
          <div className="flex flex-wrap gap-3">
            {CATEGORY_ORDER.map((c) => (
              <CategoryTag key={c} category={c} />
            ))}
          </div>
        </Block>

        <Block title="Tag · 分類列 CategoryRow">
          <div className="max-w-reader space-y-3">
            {CATEGORY_ORDER.map((c) => (
              <CategoryRow key={c} category={c} count={CATEGORY_COUNTS[c]} />
            ))}
          </div>
        </Block>

        <Block title="Tag · 狀態 / Chip 版本">
          <div className="flex flex-wrap items-center gap-3">
            <Tag tone="warn">◆ {copy.verdict.concerns}</Tag>
            <Tag tone="ok">{copy.verdict.compliant}</Tag>
            <Tag tone="accent">當前態</Tag>
            <Tag tone="ink">墨色</Tag>
            <Tag tone="neutral">中性</Tag>
            <span className="mx-2 h-4 w-px bg-line" />
            <Chip active>第20屆</Chip>
            <Chip>第19屆</Chip>
            <Chip>第18屆</Chip>
          </div>
        </Block>

        <Block title="Card">
          <div className="grid grid-cols-1 gap-6 rd:grid-cols-2">
            <Card label="合法性檢核" title="對照報告">
              <Tag tone="warn" className="mb-4">
                ◆ {copy.verdict.concerns} · {copy.verdict.confidenceMid} · 引用 3 條
              </Tag>
              <div className="mb-3 border-l-2 border-l-accent py-[3px] pl-3.5">
                <div className="mb-[3px] font-sans text-caption font-medium text-meta tnum">
                  職權行使法 §8
                </div>
                <div className="font-serif text-caption leading-snug">
                  法律修正案應經三讀 — 提案未載明三讀安排。
                </div>
              </div>
              <p className="mt-4 font-sans text-caption leading-relaxed text-meta">
                {copy.disclaimer}
              </p>
            </Card>
            <Card label="時程排定" title="法定期限">
              <div className="mb-3.5 border border-ref-border bg-ref-surface px-3 py-2.5 font-sans text-code font-medium text-ref-ink tnum">
                ◈ 設定：10 月常會 = 10/15（錨定事件）
              </div>
              {[
                ["10/01", "公告會議", "組織準則 §15"],
                ["10/05", "施政方針送達", "職權行使法 §17"],
                ["10/08", "聯合質詢登記", "職權行使法 §19"],
              ].map(([d, t, s]) => (
                <div key={d} className="flex items-baseline gap-3.5 border-b border-line-soft py-2.5">
                  <span className="min-w-[56px] font-mono text-[16px] font-medium text-ink tnum">{d}</span>
                  <span className="flex-1 font-serif text-caption">{t}</span>
                  <span className="font-sans text-caption text-meta tnum">{s}</span>
                </div>
              ))}
            </Card>
          </div>
        </Block>

        <Block title="LawRow · 索引列">
          <div>
            {SAMPLE_ROWS.map((r) => (
              <LawRow key={r.number} number={r.number} name={r.name} meta={r.meta} href="#" />
            ))}
          </div>
        </Block>

        <Block title="AmendmentTimeline · 修正沿革">
          <div className="max-w-reader">
            <AmendmentTimeline
              amendments={SAMPLE_AMENDMENTS}
              count={SAMPLE_AMENDMENT_COUNT}
              defaultOpen
            />
          </div>
        </Block>
      </section>

      {/* 5 · 條文塊（註疏本式，含邊註） */}
      <section className="mb-24">
        <SectionHead no="05" title="條文塊（註疏本式）" en="Article" />
        <div className="border border-line bg-paper p-6 hero:p-10">
          <div className="font-ui text-caption font-medium uppercase tracking-tag text-accent tnum">
            立法 · 2.0
          </div>
          <h3 className="mb-1 mt-3 font-serif text-law-title">
            國立臺東大學學生議會組織及實行準則
          </h3>
          <div className="flex flex-wrap items-center gap-3 border-b-2 border-ink pb-3.5">
            <span className="font-sans text-caption text-meta tnum">
              {copy.reader.articleCount(31)}
            </span>
            <Chip active>{copy.reader.currentBadge}</Chip>
            <Chip>第19屆</Chip>
            <span className="font-sans text-caption text-meta tnum">
              · {copy.reader.lastAmended("113.09.19")}
            </span>
          </div>

          {/* 第一章：示範真實交互參照（2.0 §1 依《組織章程》§32 訂定）。 */}
          <div className="mt-8 border-t border-line pt-3.5 text-center font-serif text-chap text-accent">
            第 一 章　總則
          </div>
          <div className="mt-6">
            <ArticleBlock
              number={SAMPLE_ARTICLE_XREF.number}
              name={SAMPLE_ARTICLE_XREF.name}
              body={
                <>
                  本組織及實行準則依{" "}
                  <Xref href="/law/0.0#art-32">
                    《國立臺東大學學生會組織章程》第三十二條
                  </Xref>{" "}
                  訂定之。
                </>
              }
              notes={SAMPLE_ARTICLE_XREF.notes}
            />
          </div>

          <div className="mt-8 border-t border-line pt-3.5 text-center font-serif text-chap text-accent">
            第 三 章　開會及會期
          </div>
          <div className="mt-6">
            <ArticleBlock
              number={SAMPLE_ARTICLE_BODY.number}
              name={SAMPLE_ARTICLE_BODY.name}
              body={SAMPLE_ARTICLE_BODY.body}
              notes={SAMPLE_ARTICLE_BODY.notes}
            />
            <ArticleBlock
              number={SAMPLE_ARTICLE_ITEMS.number}
              name={SAMPLE_ARTICLE_ITEMS.name}
              items={[...SAMPLE_ARTICLE_ITEMS.items]}
              notes={SAMPLE_ARTICLE_ITEMS.notes}
            />
            <ArticleBlock
              number={SAMPLE_ARTICLE_15.number}
              name={SAMPLE_ARTICLE_15.name}
              body={SAMPLE_ARTICLE_15.body}
              notes={SAMPLE_ARTICLE_15.notes}
            />
          </div>
        </div>
      </section>

      <footer className="border-t border-line py-12">
        <div className="flex flex-wrap justify-between gap-3">
          <span className="font-sans text-code text-meta">{copy.foot.zh}（styleguide）</span>
          <span className="font-mono text-[11.5px] tracking-wide text-meta tnum">
            {copy.foot.en}
          </span>
        </div>
      </footer>
    </main>
  );
}
