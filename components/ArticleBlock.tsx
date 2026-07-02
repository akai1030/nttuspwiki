import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Xref — 條文內的交互參照連結（accent 底線）。Phase 2/3 由 LawReference 圖產生 href。
 */
export function Xref({
  href = "#",
  children,
}: {
  href?: string;
  children: ReactNode;
}) {
  return (
    <a href={href} className="border-b border-accent text-accent no-underline">
      {children}
    </a>
  );
}

export type NoteKind = "ref" | "sch" | "amd";

export interface ArticleNote {
  kind: NoteKind;
  label: string;
  text: ReactNode;
  /** 參照可帶預覽卡（hover/展開時顯示被引用條文片段）。 */
  preview?: { title: string; body: string };
}

const NOTE_STYLE: Record<NoteKind, { border: string; label: string }> = {
  ref: { border: "border-l-accent", label: "text-accent" },
  sch: { border: "border-l-sch-line", label: "text-sch" },
  amd: { border: "border-l-accent2", label: "text-warn" },
};

function Note({ note }: { note: ArticleNote }) {
  const s = NOTE_STYLE[note.kind];
  return (
    <div className={cn("border-l-2 pl-2.5", s.border)}>
      <div className={cn("mb-[3px] font-sans text-note-label", s.label)}>
        {note.label}
      </div>
      <div className="font-sans text-note text-meta">
        {note.text}
        {note.preview && (
          <div className="mt-1.5 border border-ref-border bg-ref-surface p-2.5">
            {/* 中文法規名一律 font-sans（§7 禁止中文小字用等寬）；tnum 保留數字對齊。 */}
            <div className="mb-[3px] font-sans text-caption text-accent tnum">
              {note.preview.title}
            </div>
            <div className="font-serif text-caption leading-relaxed text-ref-ink">
              {note.preview.body}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * ArticleBlock — 單一條文塊（註疏本式）：§號(mono) │ 條名+正文/款項 │ 邊註。
 * 資料保真：items 逐條原文輸出（不解析、不改寫），以懸掛縮排排版。
 * 桌機三欄；閱讀器斷點（1000px）以下邊註降到條文下方橫排。
 */
export function ArticleBlock({
  number,
  name,
  items,
  body,
  notes,
  action,
  id,
  className,
}: {
  number: string;
  name?: string;
  /** 結構化款項；每款可為純字串或含 <Xref/> 的節點（內文參照）。與 body 擇一。 */
  items?: ReactNode[];
  /** 自由內文（可含 <Xref/>）；items 未給時使用。 */
  body?: ReactNode;
  notes?: ArticleNote[];
  /** §號下方的操作槽（如複製引用），hover 浮現。 */
  action?: ReactNode;
  id?: string;
  className?: string;
}) {
  const anchorId = id ?? `art-${number}`;
  const hasNotes = notes != null && notes.length > 0;
  return (
    <article
      id={anchorId}
      className={cn(
        "group/art grid grid-cols-[52px_minmax(0,1fr)] gap-x-[22px] gap-y-2 rd:grid-cols-[52px_minmax(0,1fr)_208px]",
        "mb-[30px] scroll-mt-[70px]",
        className
      )}
    >
      <div className="pt-1.5">
        {/* §號同時是本條永久連結（點擊把 #art-N 帶進網址列）。 */}
        <a
          href={`#${anchorId}`}
          className="font-mono text-code font-medium text-accent tnum"
        >
          §{number}
        </a>
        {action && <div className="mt-1.5">{action}</div>}
      </div>

      <div className="min-w-0">
        {name && <div className="mb-2 font-serif text-art-name">{name}</div>}
        {items && items.length > 0 ? (
          <ul className="list-none">
            {items.map((it, i) => (
              <li
                key={i}
                className="my-1.5 pl-[1.6em] -indent-[1.6em] font-serif text-art-body text-body-ink"
              >
                {it}
              </li>
            ))}
          </ul>
        ) : (
          <div className="font-serif text-art-body text-body-ink">{body}</div>
        )}
      </div>

      {hasNotes && (
        <div className="col-span-2 mt-2 flex flex-row flex-wrap gap-2.5 rd:col-span-1 rd:mt-0 rd:flex-col">
          {notes!.map((n, i) => (
            <div key={i} className="min-w-[180px] flex-1 rd:min-w-0">
              <Note note={n} />
            </div>
          ))}
        </div>
      )}
    </article>
  );
}
