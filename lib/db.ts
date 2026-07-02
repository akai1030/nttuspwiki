import { PrismaClient } from "@prisma/client";

// Next.js dev 熱重載會重複執行模組，用 global 快取避免連線爆量。
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
