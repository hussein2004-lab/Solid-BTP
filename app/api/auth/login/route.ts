import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, createSession, toPublic, SESSION_COOKIE } from "@/lib/auth";
import { getApiT } from "@/lib/api-i18n";

export async function POST(req: Request) {
  const t = await getApiT();
  const { username, password } = await req.json().catch(() => ({}));
  if (!username || !password) {
    return NextResponse.json({ error: t("loginRequired") }, { status: 400 });
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
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
