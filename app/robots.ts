import type { MetadataRoute } from "next";

/**
 * 給搜尋引擎看公開的法規與會議；幹部後台、登入、投票連結、樣式頁不給收錄。
 * /v/<token> 是發給個人的投票連結，帶權杖，絕對不能被收錄。
 */
const SITE = process.env.SITE_URL ?? "https://nttuspcodex.zeabur.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/console", "/api", "/login", "/v/", "/vote", "/styleguide"],
      },
    ],
    sitemap: `${SITE}/sitemap.xml`,
  };
}
