import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { newId } from "@/lib/db";
import { getCurrentAdmin } from "@/lib/auth";
import { getApiT } from "@/lib/api-i18n";

// Public: list every Solid-BTP store (oldest first → Daloa flagship leads).
export async function GET() {
  const stores = await prisma.store.findMany({ orderBy: { createdAt: "asc" } });
  return NextResponse.json({ stores });
}

/** Coerce an incoming body into a clean Store payload (without id/createdAt). */
function readStoreBody(body: Record<string, unknown>) {
  return {
    name: String(body.name ?? "").trim(),
    city: String(body.city ?? "").trim(),
    address: String(body.address ?? "").trim(),
    phone: String(body.phone ?? "").trim(),
    email: String(body.email ?? "").trim(),
    hours: String(body.hours ?? "").trim(),
    lat: String(body.lat ?? "").trim(),
    lon: String(body.lon ?? "").trim(),
    imageUrl: String(body.imageUrl ?? "").trim(),
    note: String(body.note ?? "").trim(),
  };
}

// Create a store. Only a super-admin may manage stores.
export async function POST(req: Request) {
  const t = await getApiT();
  const me = await getCurrentAdmin();
  if (!me) return NextResponse.json({ error: t("unauthorized") }, { status: 401 });
  if (me.role !== "super") {
    return NextResponse.json({ error: t("storeAdminOnly") }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const data = readStoreBody(body);
  if (!data.name || !data.city) {
    return NextResponse.json({ error: t("storeFields") }, { status: 400 });
  }

  const store = await prisma.store.create({ data: { id: newId(), ...data } });
  return NextResponse.json({ store }, { status: 201 });
}
