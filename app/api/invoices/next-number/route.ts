import { NextResponse } from "next/server";
import { requireAdmin, resolveStoreId, errorResponse } from "@/lib/access";
import { INVOICE_TYPE_IDS } from "@/lib/erp";
import { peekInvoiceNumber } from "@/lib/invoicing";

// Aperçu du prochain numéro pour (magasin, type), sans le consommer.
export async function GET(req: Request) {
  try {
    const admin = await requireAdmin();
    const { searchParams } = new URL(req.url);
    const type = String(searchParams.get("type") ?? "");
    if (!INVOICE_TYPE_IDS.includes(type)) {
      return NextResponse.json({ error: "Type invalide." }, { status: 400 });
    }
    const storeId = await resolveStoreId(admin, searchParams.get("storeId"));
    const number = await peekInvoiceNumber(storeId, type);
    return NextResponse.json({ number });
  } catch (e) {
    return errorResponse(e);
  }
}
