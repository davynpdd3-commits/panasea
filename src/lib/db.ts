import { PrismaClient } from "@prisma/client";

/**
 * Prisma Client singleton.
 *
 * Next.js dev mode hot-reloads server modules, which would otherwise create
 * a new PrismaClient (and a new DB connection pool) on every file save.
 * Stashing the instance on `globalThis` in development avoids that.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

let prismaInstance: PrismaClient | undefined;

if (process.env.DATABASE_URL) {
  prismaInstance =
    globalForPrisma.prisma ??
    new PrismaClient({
      log:
        process.env.NODE_ENV === "development"
          ? ["warn", "error"]
          : ["error"],
    });
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prismaInstance;
  }
} else {
  console.warn("[db] DATABASE_URL not set; PrismaClient will not be initialized during build.");
  // Proxy that throws on any property access
  const handler = {
    get(_: any, prop: string) {
      throw new Error(`PrismaClient not initialized (missing DATABASE_URL) when accessing property "${prop}"`);
    },
  };
  prismaInstance = new Proxy({}, handler) as unknown as PrismaClient;
}

export const db = prismaInstance as PrismaClient;
