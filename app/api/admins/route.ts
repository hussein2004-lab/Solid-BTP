import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { newId } from "@/lib/db";
import { getCurrentAdmin, hashPassword, toPublic } from "@/lib/auth";
import { getApiT } from "@/lib/api-i18n";

// List all admins (any authenticated admin can view the team).
export async function GET() {
  const t = await getApiT();
  const me = await getCurrentAdmin();
  if (!me) return NextResponse.json({ error: t("unauthorized") }, { status: 401 });
  const admins = await prisma.admin.findMany({ orderBy: { createdAt: "asc" } });
  return NextResponse.json({ admins: admins.map(toPublic), me: toPublic(me) });
}

// Create a sub-administrator. Only a super-admin may do this.
export async function POST(req: Request) {
  const t = await getApiT();
  const me = await getCurrentAdmin();
  if (!me) return NextResponse.json({ error: t("unauthorized") }, { status: 401 });
  if (me.role !== "super") {
    return NextResponse.json({ error: t("adminOnlyAdd") }, { status: 403 });
  }

  const { username, password } = await req.json().catch(() => ({}));
  if (!username || !password || String(password).length < 6) {
    return NextResponse.json({ error: t("adminFields") }, { status: 400 });
  }

  const exists = await prisma.admin.findFirst({
    where: { username: { equals: String(username), mode: "insensitive" } },
  });
  if (exists) {
    return NextResponse.json({ error: t("adminExists") }, { status: 409 });
  }

  const { salt, hash } = hashPassword(String(password));
  const admin = await prisma.admin.create({
    data: {
      id: newId(),
      username: String(username).trim(),
      passwordHash: hash,
      salt,
      role: "sub",
    },
  });
  return NextResponse.json({ admin: toPublic(admin) }, { status: 201 });
}
