/**
 * seed / verify 共用：JSON 型別、載入、body 合併規則。
 * 「body 怎麼從 items 合併」只能定義在這裡一處，seed 與 verify 才保證同源比對。
 */
import { readFileSync } from "node:fs";
import path from "node:path";

export interface JsonAmendment {
  date: string | null;
  roc: string;
  session_term: string | null;
  action: string;
  text: string;
}

export interface JsonArticle {
  number: string;
  name: string;
  chapter: string | null;
  items: string[];
}

export interface JsonLaw {
  file: string;
  category: string;
  number: string;
  name: string;
  title: string;
  current_date: string | null;
  current_type: string | null;
  session_label: string;
  preamble: string;
  amendment_history: JsonAmendment[];
  chapters: { title: string }[];
  articles: JsonArticle[];
  article_count: number;
}

export const PROJECT_ROOT = path.resolve(__dirname, "..");

export const JSON_PATH = path.join(
  PROJECT_ROOT,
  "法規MD轉檔",
  "法規結構化-第20屆.json"
);

export function loadLaws(jsonPath: string = JSON_PATH): JsonLaw[] {
  return JSON.parse(readFileSync(jsonPath, "utf8"));
}

/** Article.body 的唯一產生方式：款項逐條以換行合併（不增刪改任何字元）。 */
export function articleBody(items: string[]): string {
  return items.join("\n");
}

export function sessionFromLabel(label: string): number {
  const m = label.match(/(\d+)/);
  if (!m) throw new Error(`無法從 session_label 解析屆別：${label}`);
  return Number(m[1]);
}
