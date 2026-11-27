import type { MetadataRoute } from "next";

/**
 * 給搜尋引擎看公開的法規與會議。不公開的頁面不在這裡列路徑（robots.txt 誰都讀得到），
 * 改由 next.config.mjs 對那些路徑送 X-Robots-Tag: noindex。
 * 不用 Disallow 擋：被擋的頁搜尋引擎讀不到 noindex，網址反而可能出現在結果裡（帶權杖的投票連結尤其不行）。
 */
const SITE = process.env.SITE_URL ?? "https://nttuspcodex.transtation.org";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
      },
    ],
    sitemap: `${SITE}/sitemap.xml`,
  };
}
