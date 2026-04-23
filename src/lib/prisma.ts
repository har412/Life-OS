import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

if (process.env.NODE_ENV !== "production") {
  const url = process.env.DATABASE_URL || "";
  const masked = url.replace(/:([^@]+)@/, ":****@");
  console.log(`🔌 Prisma connected to: ${masked}`);
}

export const prisma =
  globalForPrisma.prisma || new PrismaClient()

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
