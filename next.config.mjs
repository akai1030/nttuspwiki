/** @type {import('next').NextConfig} */
const nextConfig = {
  // 原生 addon（@node-rs/jieba）必須外部化，不讓 webpack 打包，改由 Node 於執行期 require。
  // 註：@xenova/transformers（onnxruntime，~1GB）已自部署切離（見 lib/search/query.ts）。
  experimental: {
    serverComponentsExternalPackages: ["@node-rs/jieba"],
    // 部署（standalone）時把繁體字典檔一併帶上（供 lib/search/segment.ts 讀取）。
    // /api/search 與 /search 頁都走 jieba 斷詞，兩者都要 trace 到字典。
    outputFileTracingIncludes: {
      "/api/search": ["./lib/search/dict.txt.big.gz"],
      "/search": ["./lib/search/dict.txt.big.gz"],
    },
  },
};

export default nextConfig;
