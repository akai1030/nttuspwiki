/** @type {import('next').NextConfig} */
const nextConfig = {
  // 原生 addon（@node-rs/jieba）與含 onnxruntime-node/sharp 的 @xenova/transformers 必須外部化，
  // 不讓 webpack 打包，改由 Node 於執行期 require。
  experimental: {
    serverComponentsExternalPackages: ["@node-rs/jieba", "@xenova/transformers"],
    // 部署（standalone）時把繁體字典檔一併帶上（供 lib/search/segment.ts 讀取）。
    // /api/search 與 /search 頁都走 jieba 斷詞，兩者都要 trace 到字典。
    outputFileTracingIncludes: {
      "/api/search": ["./lib/search/dict.txt.big.gz"],
      "/search": ["./lib/search/dict.txt.big.gz"],
    },
  },
};

export default nextConfig;
