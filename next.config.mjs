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
  // 原生 addon（@node-rs/jieba）必須外部化，不讓 bundler 打包，改由 Node 於執行期 require。
  // 註：@xenova/transformers（onnxruntime，~1GB）已自部署切離（見 lib/search/query.ts）。
  serverExternalPackages: ["@node-rs/jieba"],
  // 基本安全標頭。不上 CSP：Next 的內嵌腳本要逐頁配 nonce，會把全站改成動態渲染，代價不成比例。
  async headers() {
    const base = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      // 跨站只送出來源網域、不送路徑。
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      // 不加 includeSubDomains：zeabur.app 的其他子網域不是我們的。
      { key: "Strict-Transport-Security", value: "max-age=15552000" },
    ];
    // 有按鈕會改資料的頁面禁止被別站嵌進 iframe（點擊劫持）。
    // 公開法規頁不擋：可能有人嵌在學生會網站上，嵌了也無害。
    const noFrame = { key: "X-Frame-Options", value: "DENY" };
    return [
      { source: "/:path*", headers: base },
      { source: "/console/:path*", headers: [noFrame] },
      { source: "/console", headers: [noFrame] },
      { source: "/login", headers: [noFrame] },
      { source: "/v/:path*", headers: [noFrame] },
    ];
  },
  experimental: {
    // Next 15 起預設開機就把所有路由載進記憶體；後台頁一個月才開幾次，維持 Next 14 的「用到才載」。
    // 本機量測（Next 16）：開啟 252MB、關閉 221MB（打完全部公開頁與搜尋後的 RSS）。
    preloadEntriesOnStart: false,
  },
  // 部署時把繁體字典檔一併帶上（供 lib/search/segment.ts 讀取）。
  // /api/search 與 /search 頁都走 jieba 斷詞，兩者都要 trace 到字典。
  outputFileTracingIncludes: {
    "/api/search": ["./lib/search/dict.trimmed.txt.gz"],
    "/search": ["./lib/search/dict.trimmed.txt.gz"],
  },
};

export default nextConfig;
