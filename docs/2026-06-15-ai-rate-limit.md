# Journal de décisions — Limitation de débit (throttle) des routes IA

**Date :** 2026-06-15
**Auteur :** Claude Code
**Statut :** Livré — vérifié en local (build + tests HTTP)

---

## 1. Objectif

Les routes IA (`/api/ai/search`, `/api/ai/identify`) sont **publiques** (utilisées
par le catalogue visiteur) et chaque appel **coûte** un appel Gemini facturé.
Sans garde-fou, un visiteur (ou un script) peut générer des coûts illimités et
épuiser le quota. On ajoute donc une **limitation de débit par IP**.

## 2. Choix d'implémentation

**Décision :** limiteur **en mémoire**, sans dépendance (`lib/rate-limit.ts`),
plutôt que Redis ou un service tiers.
**Pourquoi :** cohérent avec la philosophie du projet (base JSON, auth maison,
appel Gemini en `fetch` — zéro dépendance superflue). Suffisant pour une app
**mono-instance**.

Détails techniques :
- **Fenêtre glissante** : on conserve les horodatages des requêtes récentes par
  clé ; on refuse au-delà de `AI_RATE_LIMIT` sur `AI_RATE_WINDOW_MS`
  (défaut **10 requêtes / minute**). Plus juste qu'une fenêtre fixe (pas d'effet
  de bord aux frontières de minute).
- **Budget partagé par IP** entre les deux routes (clé `ai:<ip>`) : c'est le coût
  Gemini global qu'on protège, pas chaque endpoint séparément.
- **IP** extraite de `x-forwarded-for` (1er maillon) puis `x-real-ip`, repli
  `"unknown"`.
- **Vérifié *avant* tout traitement** (parsing du corps, lecture de l'image,
  appel Gemini) → une requête refusée ne consomme aucune ressource.
- **`429 Too Many Requests`** avec en-têtes `Retry-After`, `X-RateLimit-Limit`,
  `X-RateLimit-Remaining`, et message FR convivial dans le corps.
- **État ancré sur `globalThis`** : `globalThis.__aiRateLimitHits`. C'est le point
  subtil — en dev (Turbopack) Next peut **isoler les bundles de routes** (chaque
  route reçoit sa propre instance d'un module `lib/` importé) et le **HMR**
  réinitialise l'état des modules. Un simple `const map = new Map()` au niveau
  module donnait alors un **budget par route** au lieu d'un budget partagé
  (constaté : la 11ᵉ requête passait sur l'autre route). L'ancrage `globalThis`
  garantit **un seul** Map pour tout le processus.
- **Balayage opportuniste** de la Map (au-delà de 5000 clés) pour éviter une
  croissance non bornée.

## 3. Intégration

- `enforceAiRateLimit(req)` renvoie une `NextResponse` `429` ou `null`. Appelé en
  **première ligne** des deux `POST`.
- **Frontend** : aucun changement nécessaire — les gestionnaires d'erreur existants
  (catalogue public + onglets admin) lisent déjà `d.error` sur réponse non-`ok` et
  affichent le message. Le `429` affiche donc « Trop de requêtes… » dans l'encadré
  d'erreur convivial déjà en place.

## 4. Vérifications

- `npx tsc --noEmit` : **0 erreur**. `npm run build` : **succès**.
- **Rafale 12 requêtes** sur `/api/ai/search` (corps vide → `400` rapide, sans
  appel Gemini) : req 1→10 = `400`, req 11→12 = **`429`**.
- **Budget partagé** : 6 `search` + 4 `identify` = 10 (tous `400`), puis 11ᵉ sur
  `identify` = **`429`** avec `Retry-After: 60` et `X-RateLimit-Remaining: 0`.
  (Confirme l'effet du correctif `globalThis` : avant, l'autre route repartait à
  zéro.)
- Astuce de test : `enforceAiRateLimit` étant vérifié **avant** le parsing, des
  requêtes au corps vide comptent dans le budget tout en restant gratuites côté
  Gemini — pratique pour tester la limite sans brûler le quota.

## 5. Réglage & suites

- Ajuster `AI_RATE_LIMIT` / `AI_RATE_WINDOW_MS` dans `lib/rate-limit.ts` selon le
  trafic réel.
- **Multi-instances / serverless** : l'état en mémoire n'est pas partagé entre
  processus → migrer vers un store partagé (Redis, Upstash) le cas échéant.
- Possible évolution : limites différenciées (plus strictes pour la photo,
  plus souples pour le texte) si les coûts divergent.
