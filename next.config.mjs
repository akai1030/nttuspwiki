import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

/**
 * 版本資訊於「建置時」inline 進 bundle（next.config 的 env 是編譯期展開）。
 * 用途：部署後一眼看得出線上跑的是哪一版、什麼時候建的——不必翻 deploy log。
 *
 * commit SHA 來源依序：各家 PaaS/CI 環境變數 → 本機 git → 空字串。
 * 建置時間一定拿得到，所以就算 SHA 抓不到，仍足以判斷「這次部署有沒有生效」。
 */
function buildSha() {
  const fromEnv =
    process.env.ZEABUR_GIT_COMMIT_SHA ??
    process.env.VERCEL_GIT_COMMIT_SHA ??
    process.env.RAILWAY_GIT_COMMIT_SHA ??
    process.env.GITHUB_SHA ??
    process.env.CF_PAGES_COMMIT_SHA;
  if (fromEnv) return fromEnv.slice(0, 7);
  try {
    return execSync("git rev-parse --short HEAD", { stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
  } catch {
    return ""; // 建置環境沒有 .git（例如自 tarball 建）就留空，不讓建置失敗
  }
}

function appVersion() {
  try {
    const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8"));
    return pkg.version ?? "";
  } catch {
    return "";
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: appVersion(),
    NEXT_PUBLIC_BUILD_SHA: buildSha(),
    NEXT_PUBLIC_BUILD_TIME: new Date().toISOString(),
  },
  // 原生 addon（@node-rs/jieba）必須外部化，不讓 webpack 打包，改由 Node 於執行期 require。
  // 註：@xenova/transformers（onnxruntime，~1GB）已自部署切離（見 lib/search/query.ts）。
  experimental: {
    serverComponentsExternalPackages: ["@node-rs/jieba"],
    // 部署（standalone）時把繁體字典檔一併帶上（供 lib/search/segment.ts 讀取）。
    // /api/search 與 /search 頁都走 jieba 斷詞，兩者都要 trace 到字典。
    outputFileTracingIncludes: {
      "/api/search": ["./lib/search/dict.trimmed.txt.gz"],
      "/search": ["./lib/search/dict.trimmed.txt.gz"],
    },
  },
};

export default nextConfig;
