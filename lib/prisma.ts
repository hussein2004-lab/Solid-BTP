import { PrismaClient } from "@prisma/client";

// Single PrismaClient per process. Anchored on `globalThis` so Next's dev HMR
// and route-bundle isolation don't open a new pool on every reload.
const globalForPrisma = globalThis as unknown as { __prisma?: PrismaClient };

export const prisma: PrismaClient =
  globalForPrisma.__prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.__prisma = prisma;
}
