import { NextResponse } from "next/server";
import { getCurrentAdmin, toPublic } from "@/lib/auth";

export async function GET() {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ admin: null }, { status: 200 });
  return NextResponse.json({ admin: toPublic(admin) });
}
