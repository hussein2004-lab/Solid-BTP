import { NextResponse } from "next/server";
import { translateBatch, aiError } from "@/lib/gemini";
import { enforceAiRateLimit } from "@/lib/rate-limit";
import { getApiT } from "@/lib/api-i18n";
import { routing } from "@/i18n/routing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/translate — translate public catalogue strings on the fly.
 * Body: { texts: string[], target: locale }
 *
 * Used by the client catalogue to show article names/descriptions (stored in
 * French) in the active language. Shares the AI per-IP rate-limit budget; the
 * client caches results in localStorage so this is hit at most once per locale.
 * If `target` is the source/unknown locale, the texts are echoed back as-is.
 */
export async function POST(req: Request) {
  const limited = await enforceAiRateLimit(req);
  if (limited) return limited;

  const t = await getApiT();
  const body = await req.json().catch(() => ({}));
  const target = String(body?.target ?? "");
  const texts = Array.isArray(body?.texts) ? body.texts.map((s: unknown) => String(s ?? "")) : null;

  if (!texts) {
    return NextResponse.json({ error: t("aiUnexpected") }, { status: 400 });
  }
  // Source language (French) or anything unknown → nothing to translate.
  if (!(routing.locales as readonly string[]).includes(target) || target === routing.defaultLocale) {
    return NextResponse.json({ translations: texts });
  }

  try {
    const translations = await translateBatch(texts.slice(0, 200), target);
    return NextResponse.json({ translations });
  } catch (e) {
    return aiError(e, { config: t("aiConfig"), unavailable: t("aiUnavailable"), unexpected: t("aiUnexpected") });
  }
}
