// Limiteur de débit par IP, **en mémoire** et sans dépendance — cohérent avec la
// philosophie du projet (pas de Redis). Fenêtre glissante : on garde l'horodatage
// des requêtes récentes par clé et on refuse au-delà de `limit` sur `windowMs`.
//
// Limites : l'état est par-processus (réinitialisé au redémarrage) et n'est pas
// partagé entre plusieurs instances. Suffisant pour cette app mono-instance ;
// pour un déploiement multi-instances, basculer vers un store partagé (Redis…).

import { NextResponse } from "next/server";
import { getApiT } from "./api-i18n";

// État ancré sur `globalThis` : un seul Map partagé par tout le processus, même
// quand Next isole les bundles de routes (dev/Turbopack) ou recharge à chaud (HMR).
const globalForRateLimit = globalThis as unknown as { __aiRateLimitHits?: Map<string, number[]> };
const hits: Map<string, number[]> =
  globalForRateLimit.__aiRateLimitHits ?? (globalForRateLimit.__aiRateLimitHits = new Map());

// Budget commun à toutes les routes IA (coût Gemini) : N requêtes / fenêtre / IP.
export const AI_RATE_LIMIT = 10;
export const AI_RATE_WINDOW_MS = 60_000; // 1 minute

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSec: number;
}

/** Cœur du limiteur (fenêtre glissante). `now` injecté pour la testabilité. */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now: number,
): RateLimitResult {
  const cutoff = now - windowMs;
  const recent = (hits.get(key) ?? []).filter((t) => t > cutoff);

  if (recent.length >= limit) {
    hits.set(key, recent);
    const retryAfterSec = Math.max(1, Math.ceil((recent[0] + windowMs - now) / 1000));
    return { allowed: false, remaining: 0, retryAfterSec };
  }

  recent.push(now);
  hits.set(key, recent);

  // Balayage opportuniste pour éviter une croissance non bornée de la Map.
  if (hits.size > 5000) {
    for (const [k, arr] of hits) {
      if (arr.every((t) => t <= cutoff)) hits.delete(k);
    }
  }

  return { allowed: true, remaining: limit - recent.length, retryAfterSec: 0 };
}

/** Purge les clés dont tous les hits sont sortis de la fenêtre (mémoire bornée). */
function sweep(cutoff: number): void {
  if (hits.size <= 5000) return;
  for (const [k, arr] of hits) {
    if (arr.every((t) => t <= cutoff)) hits.delete(k);
  }
}

/**
 * Réserve ATOMIQUEMENT un hit sur plusieurs compteurs : soit toutes les limites
 * passent et un hit est enregistré sur chacune, soit rien n'est enregistré.
 * Synchrone (aucun `await`) → pas de course entre vérification et enregistrement.
 * `release()` annule la réservation (ex. connexion réussie : seuls les échecs comptent).
 */
export function reserve(
  buckets: Array<{ key: string; limit: number }>,
  windowMs: number,
  now: number,
): { allowed: boolean; retryAfterSec: number; release: () => void } {
  const cutoff = now - windowMs;
  let retryAfterSec = 0;
  for (const { key, limit } of buckets) {
    const recent = (hits.get(key) ?? []).filter((t) => t > cutoff);
    if (recent.length) hits.set(key, recent);
    else hits.delete(key);
    if (recent.length >= limit) {
      retryAfterSec = Math.max(retryAfterSec, Math.ceil((recent[0] + windowMs - now) / 1000), 1);
    }
  }
  if (retryAfterSec > 0) return { allowed: false, retryAfterSec, release: () => {} };

  for (const { key } of buckets) {
    const arr = hits.get(key) ?? [];
    arr.push(now);
    hits.set(key, arr);
  }
  sweep(cutoff);
  return {
    allowed: true,
    retryAfterSec: 0,
    release: () => {
      for (const { key } of buckets) {
        const arr = hits.get(key);
        const i = arr ? arr.lastIndexOf(now) : -1;
        if (arr && i >= 0) arr.splice(i, 1);
        if (arr && arr.length === 0) hits.delete(key);
      }
    },
  };
}

/**
 * Faut-il croire les en-têtes de proxy ? Oui sur Vercel (la plateforme les
 * réécrit) ou si TRUST_PROXY=1 (reverse proxy maison type nginx). Sinon le
 * client peut les forger librement → on les ignore.
 */
const TRUST_PROXY = process.env.TRUST_PROXY === "1" || Boolean(process.env.VERCEL);

/**
 * Adresse IP du client, ou `null` si elle n'est pas fiable (pas de proxy de
 * confiance). Derrière un proxy de confiance : `x-real-ip`, sinon la DERNIÈRE
 * entrée de `x-forwarded-for` (ajoutée par ce proxy) — jamais la première.
 */
export function clientIp(req: Request): string | null {
  if (!TRUST_PROXY) return null;
  const real = req.headers.get("x-real-ip")?.trim();
  if (real) return real;
  const parts = (req.headers.get("x-forwarded-for") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  return parts.length ? parts[parts.length - 1]! : null;
}

/**
 * Applique le budget IA partagé à une requête. Renvoie une réponse `429`
 * (avec en-tête `Retry-After`) si la limite est dépassée, sinon `null`.
 */
export async function enforceAiRateLimit(req: Request): Promise<NextResponse | null> {
  // IP non fiable → budget commun ("direct") : plus strict, mais infalsifiable.
  const key = `ai:${clientIp(req) ?? "direct"}`;
  const { allowed, remaining, retryAfterSec } = rateLimit(
    key,
    AI_RATE_LIMIT,
    AI_RATE_WINDOW_MS,
    Date.now(),
  );
  if (allowed) {
    return null;
  }
  const t = await getApiT();
  return NextResponse.json(
    { error: t("rateLimited") },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfterSec),
        "X-RateLimit-Limit": String(AI_RATE_LIMIT),
        "X-RateLimit-Remaining": String(remaining),
      },
    },
  );
}
