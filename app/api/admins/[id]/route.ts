import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin } from "@/lib/auth";
import { getApiT } from "@/lib/api-i18n";

// Delete an administrator. Rules:
//  - only a super-admin may delete accounts;
//  - a super-admin can never be deleted (the principal is protected).
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const t = await getApiT();
  const me = await getCurrentAdmin();
  if (!me) return NextResponse.json({ error: t("unauthorized") }, { status: 401 });
  if (me.role !== "super") {
    return NextResponse.json({ error: t("subCannotDelete") }, { status: 403 });
  }

  const { id } = await params;
  const target = await prisma.admin.findUnique({ where: { id } });
  if (!target) return NextResponse.json({ error: t("accountNotFound") }, { status: 404 });
  if (target.role === "super") {
    return NextResponse.json({ error: t("principalProtected") }, { status: 403 });
  }

  // Remove the account and any active sessions it holds, atomically.
  await prisma.$transaction([
    prisma.session.deleteMany({ where: { adminId: id } }),
    prisma.admin.delete({ where: { id } }),
  ]);
  return NextResponse.json({ ok: true });
}
