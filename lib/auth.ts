import crypto from "crypto";
import { cookies } from "next/headers";
import type { Admin as DbAdmin } from "@prisma/client";
import { prisma } from "./prisma";
import type { PublicAdmin, Role } from "./types";

export const SESSION_COOKIE = "sbtp_session";

export function hashPassword(password: string, salt?: string) {
  const s = salt ?? crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, s, 64).toString("hex");
  return { salt: s, hash };
}

export function verifyPassword(password: string, salt: string, hash: string): boolean {
  const h = crypto.scryptSync(password, salt, 64).toString("hex");
  const a = Buffer.from(h, "hex");
  const b = Buffer.from(hash, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** Strip secrets and normalise `createdAt` to an ISO string for the client. */
export function toPublic(admin: {
  id: string;
  username: string;
  role: string;
  createdAt: Date | string;
}): PublicAdmin {
  return {
    id: admin.id,
    username: admin.username,
    role: admin.role as Role,
    createdAt: typeof admin.createdAt === "string" ? admin.createdAt : admin.createdAt.toISOString(),
  };
}

export async function createSession(adminId: string): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");
  await prisma.session.create({ data: { token, adminId } });
  return token;
}

export async function destroySession(token: string): Promise<void> {
  await prisma.session.deleteMany({ where: { token } });
}

/** Resolve the currently authenticated admin from the session cookie, or null. */
export async function getCurrentAdmin(): Promise<DbAdmin | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await prisma.session.findUnique({ where: { token } });
  if (!session) return null;
  return prisma.admin.findUnique({ where: { id: session.adminId } });
}
