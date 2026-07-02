/** @type {import('next').NextConfig} */
const nextConfig = {
  // @node-rs/jieba 是原生 .node addon，必須外部化（不讓 webpack 打包，改由 Node 於執行期 require）。
  experimental: {
    serverComponentsExternalPackages: ["@node-rs/jieba"],
    // 部署（standalone）時把繁體字典檔一併帶上（供 lib/search/segment.ts 讀取）。
    outputFileTracingIncludes: {
      "/api/search": ["./lib/search/dict.txt.big.gz"],
    },
  },
};

export default nextConfig;
