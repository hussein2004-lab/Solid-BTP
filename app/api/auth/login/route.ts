import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, createSession, toPublic, SESSION_COOKIE, SESSION_MAX_AGE_SEC } from "@/lib/auth";
import { getApiT } from "@/lib/api-i18n";
import { rateLimit, clientIp } from "@/lib/rate-limit";

// Anti brute-force : 10 tentatives / 15 min par IP, et 5 / 15 min par identifiant.
const LOGIN_WINDOW_MS = 15 * 60_000;

export async function POST(req: Request) {
  const t = await getApiT();
  const { username, password } = await req.json().catch(() => ({}));
  if (!username || !password) {
    return NextResponse.json({ error: t("loginRequired") }, { status: 400 });
  }

  const now = Date.now();
  const byIp = rateLimit(`login-ip:${clientIp(req)}`, 10, LOGIN_WINDOW_MS, now);
  const byUser = rateLimit(`login-user:${String(username).toLowerCase()}`, 5, LOGIN_WINDOW_MS, now);
  if (!byIp.allowed || !byUser.allowed) {
    const retry = Math.max(byIp.retryAfterSec, byUser.retryAfterSec);
    return NextResponse.json(
      { error: t("rateLimited") },
      { status: 429, headers: { "Retry-After": String(retry) } },
    );
  }

  const admin = await prisma.admin.findFirst({
    where: { username: { equals: String(username), mode: "insensitive" } },
  });
  if (!admin || !verifyPassword(String(password), admin.salt, admin.passwordHash)) {
    return NextResponse.json({ error: t("loginInvalid") }, { status: 401 });
  }

  const token = await createSession(admin.id);
  const res = NextResponse.json({ admin: toPublic(admin) });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SEC,
  });
  return res;
}
