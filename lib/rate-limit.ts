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

/** Adresse IP du client (best-effort derrière un proxy). */
export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

/**
 * Applique le budget IA partagé à une requête. Renvoie une réponse `429`
 * (avec en-tête `Retry-After`) si la limite est dépassée, sinon `null`.
 */
export async function enforceAiRateLimit(req: Request): Promise<NextResponse | null> {
  const key = `ai:${clientIp(req)}`;
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
