import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { getCurrentAdmin } from "@/lib/auth";
import { getApiT } from "@/lib/api-i18n";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 5 * 1024 * 1024; // 5 Mo
const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/heic": "jpg",
  "image/heif": "jpg",
};

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

/**
 * POST /api/upload — téléverse une image d'article (admin uniquement).
 *
 * Entrée : `multipart/form-data` avec un champ `image` (≤ 5 Mo).
 * L'image est écrite dans `public/uploads/` et l'URL publique est renvoyée.
 * Réponse : { url: "/uploads/<id>.<ext>" }
 */
export async function POST(req: Request) {
  const t = await getApiT();
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: t("unauthorized") }, { status: 401 });

  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json({ error: t("uploadMultipart") }, { status: 400 });
  }

  try {
    const form = await req.formData();
    const file = form.get("image");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: t("imageMissing") }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: t("imageTooLarge") }, { status: 400 });
    }
    const ext = EXT_BY_MIME[file.type];
    if (!ext) {
      return NextResponse.json({ error: t("uploadFormat") }, { status: 400 });
    }

    if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

    const filename = `${crypto.randomBytes(10).toString("hex")}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(path.join(UPLOAD_DIR, filename), buffer);

    return NextResponse.json({ url: `/uploads/${filename}` }, { status: 201 });
  } catch {
    return NextResponse.json({ error: t("uploadFailed") }, { status: 500 });
  }
}
