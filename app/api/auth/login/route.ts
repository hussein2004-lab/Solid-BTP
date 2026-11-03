import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, createSession, toPublic, SESSION_COOKIE, SESSION_MAX_AGE_SEC } from "@/lib/auth";
import { getApiT } from "@/lib/api-i18n";
import { checkLimit, recordHit, clientIp } from "@/lib/rate-limit";

// Anti brute-force : seuls les ÉCHECS comptent. 10 échecs / 15 min par IP, et
// 5 échecs / 15 min par couple (identifiant, IP) — clé liée à l'IP pour qu'un
// tiers ne puisse pas bloquer un compte depuis ailleurs (pas de verrouillage DoS).
const LOGIN_WINDOW_MS = 15 * 60_000;
const MAX_FAILS_PER_IP = 10;
const MAX_FAILS_PER_USER_IP = 5;

export async function POST(req: Request) {
  const t = await getApiT();
  const { username, password } = await req.json().catch(() => ({}));
  if (!username || !password) {
    return NextResponse.json({ error: t("loginRequired") }, { status: 400 });
  }

  const now = Date.now();
  const ip = clientIp(req);
  const ipKey = `login-ip:${ip}`;
  const userKey = `login-user:${String(username).toLowerCase()}:${ip}`;
  const byIp = checkLimit(ipKey, MAX_FAILS_PER_IP, LOGIN_WINDOW_MS, now);
  const byUser = checkLimit(userKey, MAX_FAILS_PER_USER_IP, LOGIN_WINDOW_MS, now);
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
    recordHit(ipKey, now);
    recordHit(userKey, now);
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
