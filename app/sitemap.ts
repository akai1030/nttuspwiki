import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";

// request 時產生：建置期不連 DB（同 law／meetings 頁的做法），法規或會議增減也會即時反映
export const dynamic = "force-dynamic";

const SITE = process.env.SITE_URL ?? "https://nttuspcodex.zeabur.app";

/**
 * 公開頁：首頁、法規總覽與各部現行法規、會議總覽與 admin 開放的公開會議、更新紀錄。
 * 只列 isCurrent 的法規（/law/[number] 也只查現行版）與 isPublic 的會議（同 getPublicMeetingByKey）。
 * DB 連不上時只回固定頁，不讓整份 sitemap 失敗。
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const fixed: MetadataRoute.Sitemap = [
    { url: `${SITE}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE}/law`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE}/meetings`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE}/meetings/about`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${SITE}/meetings/schedule`, changeFrequency: "weekly", priority: 0.5 },
    { url: `${SITE}/updates`, changeFrequency: "monthly", priority: 0.3 },
  ];
  try {
    const [laws, meetings] = await Promise.all([
      prisma.law.findMany({
        where: { isCurrent: true },
        select: { number: true, currentDate: true },
        orderBy: { number: "asc" },
      }),
      prisma.meeting.findMany({
        where: { isPublic: true },
        select: { id: true, slug: true, updatedAt: true },
      }),
    ]);
    return [
      ...fixed,
      ...laws.map((l) => ({
        url: `${SITE}/law/${encodeURIComponent(l.number)}`,
        ...(l.currentDate ? { lastModified: l.currentDate } : {}),
        changeFrequency: "monthly" as const,
        priority: 0.8,
      })),
      ...meetings.map((m) => ({
        url: `${SITE}/meetings/${encodeURIComponent(m.slug ?? m.id)}`,
        lastModified: m.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.6,
      })),
    ];
  } catch {
    return fixed;
  }
}
