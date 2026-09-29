import { defineConfig, globalIgnores } from "eslint/config";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

export default defineConfig([
  ...nextCoreWebVitals,
  {
    rules: {
      // 全站刻意一律用 <a> 整頁換頁（54 處，沒有一處用 next/link）。
      // Next 14 的 next lint 不對 app/ 路由套這條，ESLint 9 flat config 開始套；
      // 改成 <Link> 會改變換頁行為，不屬於升級範圍，維持原狀。
      "@next/next/no-html-link-for-pages": "off",
    },
  },
  // 原型與示範頁是設計參考檔，不是 app 程式碼。
  globalIgnores([".next/**", "node_modules/**", "prototype/**", "法規MD轉檔/**", "next-env.d.ts"]),
]);
