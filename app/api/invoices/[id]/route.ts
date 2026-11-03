import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, canAccessStore, errorResponse } from "@/lib/access";

// Détail d'une facture (avec ses lignes), si le magasin est accessible.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const invoice = await prisma.invoice.findUnique({ where: { id }, include: { items: true } });
    if (!invoice) return NextResponse.json({ error: "Facture introuvable." }, { status: 404 });
    if (!(await canAccessStore(admin, invoice.storeId))) {
      return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
    }
    return NextResponse.json({ invoice });
  } catch (e) {
    return errorResponse(e);
  }
}
