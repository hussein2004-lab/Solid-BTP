import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { newId } from "@/lib/db";
import { getCurrentAdmin } from "@/lib/auth";
import { getApiT } from "@/lib/api-i18n";

// Public: submit a contact / order request.
export async function POST(req: Request) {
  const t = await getApiT();
  const body = await req.json().catch(() => ({}));
  const { name, email, phone, dateNeeded, message, storeId } = body;
  if (!name || !email || !phone) {
    return NextResponse.json({ error: t("orderFields") }, { status: 400 });
  }

  // Keep the chosen store only if it really exists (ignore stale/forged ids).
  let chosenStoreId = "";
  if (storeId) {
    const store = await prisma.store.findUnique({ where: { id: String(storeId) } });
    if (store) chosenStoreId = store.id;
  }

  await prisma.order.create({
    data: {
      id: newId(),
      name: String(name).trim(),
      email: String(email).trim(),
      phone: String(phone).trim(),
      dateNeeded: String(dateNeeded ?? "").trim(),
      message: String(message ?? "").trim(),
      storeId: chosenStoreId,
    },
  });
  return NextResponse.json({ ok: true }, { status: 201 });
}

// Protected: list submitted orders, newest first.
export async function GET() {
  const t = await getApiT();
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: t("unauthorized") }, { status: 401 });
  const orders = await prisma.order.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ orders });
}
