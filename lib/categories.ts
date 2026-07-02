/**
 * 五類法規的顯示設定（顏色識別 + EN + 排序）。
 * 顏色只用於「分類標籤／圓點」（DESIGN-SYSTEM §1 五類分類識別色 / §7 主色唯一原則）。
 * zh 為資料層 Law.category 的實際值（見 data/seed.ts）；EN 取自 lib/copy.ts。
 */
import { copy } from "./copy";

export type CategoryKey = keyof typeof copy.categories;

export interface CategoryConfig {
  /** 中文分類名（= Law.category） */
  zh: CategoryKey;
  /** 英文小標 */
  en: string;
  /** 分類標籤實色底的 Tailwind class（token 對應色，白字） */
  labelClass: string;
  /** 分類圓點/文字用的識別色 Tailwind text class */
  dotClass: string;
}

/** 顯示順序：章程 → 立法 → 行政 → 司法 → 選舉。 */
export const CATEGORY_ORDER: CategoryKey[] = [
  "最高章程",
  "立法",
  "行政",
  "司法",
  "選舉",
];

const CONFIG: Record<CategoryKey, CategoryConfig> = {
  最高章程: {
    zh: "最高章程",
    en: copy.categories["最高章程"],
    labelClass: "bg-cat-charter text-white",
    dotClass: "text-cat-charter",
  },
  立法: {
    zh: "立法",
    en: copy.categories["立法"],
    labelClass: "bg-cat-legis text-white",
    dotClass: "text-cat-legis",
  },
  行政: {
    zh: "行政",
    en: copy.categories["行政"],
    labelClass: "bg-cat-exec text-white",
    dotClass: "text-cat-exec",
  },
  司法: {
    zh: "司法",
    en: copy.categories["司法"],
    labelClass: "bg-cat-judic text-white",
    dotClass: "text-cat-judic",
  },
  選舉: {
    zh: "選舉",
    en: copy.categories["選舉"],
    labelClass: "bg-cat-elect text-white",
    dotClass: "text-cat-elect",
  },
};

export function categoryConfig(zh: string): CategoryConfig {
  return CONFIG[zh as CategoryKey] ?? CONFIG["最高章程"];
}
