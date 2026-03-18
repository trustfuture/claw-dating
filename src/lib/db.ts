import { PrismaClient } from "@prisma/client";
import { validateEnv } from "@/lib/env";

function hydrateDatabaseEnv() {
  const pooledUrl =
    process.env.STORAGE_POSTGRES_PRISMA_URL ||
    process.env.STORAGE_DATABASE_URL ||
    process.env.STORAGE_POSTGRES_URL;
  const directUrl =
    process.env.STORAGE_POSTGRES_URL_NON_POOLING ||
    process.env.STORAGE_DATABASE_URL_UNPOOLED;

  if (
    pooledUrl &&
    (!process.env.DATABASE_URL || process.env.DATABASE_URL.startsWith("file:"))
  ) {
    process.env.DATABASE_URL = pooledUrl;
  }

  if (directUrl && !process.env.DIRECT_URL) {
    process.env.DIRECT_URL = directUrl;
  }
}

hydrateDatabaseEnv();
validateEnv();

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
