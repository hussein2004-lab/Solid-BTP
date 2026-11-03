import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, toPublic, verifyPassword } from "@/lib/auth";
import { requireAdmin, errorResponse } from "@/lib/access";

// Modifier ses propres identifiants (nom d'utilisateur et/ou mot de passe).
// Tout admin connecté peut changer SON compte.
export async function PATCH(req: Request) {
  try {
    const me = await requireAdmin();
    const body = await req.json().catch(() => ({}));

    const currentPassword = String(body.currentPassword ?? "");
    if (!verifyPassword(currentPassword, me.salt, me.passwordHash)) {
      return NextResponse.json({ error: "Mot de passe actuel incorrect." }, { status: 403 });
    }

    const data: Record<string, unknown> = {};

    const username = String(body.username ?? "").trim();
    if (username && username !== me.username) {
      const exists = await prisma.admin.findFirst({
        where: { username: { equals: username, mode: "insensitive" }, id: { not: me.id } },
      });
      if (exists) return NextResponse.json({ error: "Ce nom d'utilisateur est déjà pris." }, { status: 409 });
      data.username = username;
    }

    const newPassword = String(body.newPassword ?? "");
    if (newPassword) {
      if (newPassword.length < 6) return NextResponse.json({ error: "Le mot de passe doit faire au moins 6 caractères." }, { status: 400 });
      const { salt, hash } = hashPassword(newPassword);
      data.salt = salt;
      data.passwordHash = hash;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "Aucune modification." }, { status: 400 });
    }

    const updated = await prisma.admin.update({ where: { id: me.id }, data });
    return NextResponse.json({ admin: toPublic(updated) });
  } catch (e) {
    return errorResponse(e);
  }
}
