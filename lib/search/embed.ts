/**
 * 本地免費離線語意向量（@xenova/transformers）。
 * 模型：multilingual-e5-small（384 維、多語含繁中、量化）。零 API 費、離線（首次下載後快取）。
 * e5 慣例：文件加前綴 "passage: "、查詢加 "query: "，檢索效果較佳。
 *
 * 部署（Phase 6）：模型檔於首次呼叫下載到快取；Zeabur 冷啟動會下載一次，或預先烘進 image。
 */
import { pipeline, type FeatureExtractionPipeline } from "@xenova/transformers";

export const EMBED_MODEL = "Xenova/multilingual-e5-small";
export const EMBED_DIM = 384;

let extractorP: Promise<FeatureExtractionPipeline> | null = null;
function getExtractor(): Promise<FeatureExtractionPipeline> {
  if (!extractorP) extractorP = pipeline("feature-extraction", EMBED_MODEL);
  return extractorP;
}

async function embed(prefixed: string): Promise<number[]> {
  const ex = await getExtractor();
  const out = await ex(prefixed, { pooling: "mean", normalize: true });
  return Array.from(out.data as Float32Array);
}

/** 文件向量（索引用）。 */
export function embedPassage(text: string): Promise<number[]> {
  return embed("passage: " + text);
}

/** 查詢向量。 */
export function embedQuery(text: string): Promise<number[]> {
  return embed("query: " + text);
}

/** 轉成 pgvector 文字字面值 '[0.1,0.2,…]'。 */
export function toVectorLiteral(v: number[]): string {
  return "[" + v.join(",") + "]";
}
