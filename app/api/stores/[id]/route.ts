import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin } from "@/lib/auth";
import { getApiT } from "@/lib/api-i18n";

/** Keep a trimmed string field when provided, else the current value. */
function pick(body: Record<string, unknown>, key: string, current: string): string {
  return body[key] !== undefined ? String(body[key]).trim() : current;
}

// Update a store. Super-admin only.
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const t = await getApiT();
  const me = await getCurrentAdmin();
  if (!me) return NextResponse.json({ error: t("unauthorized") }, { status: 401 });
  if (me.role !== "super") {
    return NextResponse.json({ error: t("storeAdminOnly") }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const current = await prisma.store.findUnique({ where: { id } });
  if (!current) return NextResponse.json({ error: t("storeNotFound") }, { status: 404 });

  const store = await prisma.store.update({
    where: { id },
    data: {
      name: pick(body, "name", current.name),
      city: pick(body, "city", current.city),
      address: pick(body, "address", current.address),
      phone: pick(body, "phone", current.phone),
      email: pick(body, "email", current.email),
      hours: pick(body, "hours", current.hours),
      lat: pick(body, "lat", current.lat),
      lon: pick(body, "lon", current.lon),
      imageUrl: pick(body, "imageUrl", current.imageUrl),
      note: pick(body, "note", current.note),
    },
  });
  return NextResponse.json({ store });
}

// Delete a store. Super-admin only.
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const t = await getApiT();
  const me = await getCurrentAdmin();
  if (!me) return NextResponse.json({ error: t("unauthorized") }, { status: 401 });
  if (me.role !== "super") {
    return NextResponse.json({ error: t("storeAdminOnly") }, { status: 403 });
  }

  const { id } = await params;
  const { count } = await prisma.store.deleteMany({ where: { id } });
  if (count === 0) {
    return NextResponse.json({ error: t("storeNotFound") }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
