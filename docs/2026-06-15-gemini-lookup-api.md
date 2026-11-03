# Journal de décisions — Recherche d'articles par IA (Gemini)

**Date :** 2026-06-15
**Auteur :** Claude Code
**Statut :** Livré — routes API fonctionnelles, **frontend non modifié** (branchement prévu à l'étape suivante)

---

## 1. Objectif

Rendre la recherche du catalogue « intelligente » via l'API **Google Gemini**
(`gemini-2.5-flash-lite`), selon deux modes :

1. **Recherche texte** — le visiteur décrit son besoin en langage naturel
   (« je veux repeindre une chambre de 12 m² ») et reçoit les articles adaptés.
2. **Recherche photo** — le visiteur envoie une photo d'un outil / matériau ;
   Gemini identifie l'objet et propose la liste des articles correspondants.

Périmètre volontairement limité au **backend** : construire les deux routes API
qui renvoient des données d'article structurées. Aucune modification de l'UI.

> Note : l'énoncé d'origine était un gabarit « suivi de calories / aliments »
> (résidu déjà signalé dans le journal initial). Il a été **adapté au contexte
> quincaillerie** : « aliment » → **article du catalogue**, conformément au reste
> du projet Solid-BTP.

## 2. Ce qui a été ajouté

- `lib/gemini.ts` — wrapper partagé :
  - `geminiJSON(parts, schema)` : appel REST `generateContent` en sortie JSON
    forcée (`responseMimeType: application/json` + `responseSchema`).
  - `catalogueContext(articles)` : rendu compact du catalogue pour le prompt.
  - `hydrateMatches(articles, picks)` : transforme les `id` renvoyés par Gemini
    en `Article` réels issus de la base (les `id` inconnus sont ignorés).
  - `aiError(e)` : mapping d'erreurs → réponses HTTP propres.
  - `MATCHES_SCHEMA` : fragment de schéma réutilisé par les deux routes.
- `app/api/ai/search/route.ts` — `POST` recherche texte.
- `app/api/ai/identify/route.ts` — `POST` recherche photo (multimodal).
- `CLAUDE.md` — section « Recherche IA (Gemini) », arborescence et stack mises à jour.

### Contrats d'API

| Route | Entrée | Sortie |
|---|---|---|
| `POST /api/ai/search` | `{ query: string }` | `{ query, note, results: MatchedArticle[] }` |
| `POST /api/ai/identify` | `multipart/form-data` (champ `image`) **ou** `{ imageBase64, mimeType }` | `{ identified, objectDescription, note, results: MatchedArticle[] }` |

`MatchedArticle` = `Article` (du catalogue) + `reason: string` + `score: number` (0→1).

## 3. Choix techniques et justifications

### Appel REST via `fetch`, pas de SDK (`@google/genai`)
**Décision :** appeler directement l'endpoint `generativelanguage.googleapis.com`
avec `fetch`, plutôt qu'ajouter le SDK officiel.
**Pourquoi :** cohérent avec la philosophie « zéro dépendance superflue » déjà
retenue (base JSON, auth `crypto` maison). `fetch` est natif (Node 18+/Next 16),
l'API REST de Gemini est stable, et on évite une dépendance de plus à maintenir.
**Compromis :** on gère nous-mêmes la forme de la requête/réponse — encapsulé
dans un seul fichier (`lib/gemini.ts`) pour limiter la surface.

### Mise en correspondance avec le catalogue réel (anti-hallucination)
**Décision :** on envoie le catalogue à Gemini, mais on lui demande de ne
renvoyer que des **`id` existants** ; on **ré-hydrate** ensuite ces `id` depuis
`data/db.json`. La donnée renvoyée au client provient toujours de la base.
**Pourquoi :** garantit des prix/descriptions exacts et évite que l'IA invente
des produits ou des tarifs. Les `id` hallucinés sont silencieusement écartés.
**Compromis :** Gemini ne peut proposer que ce qui est en stock — c'est
exactement le comportement voulu pour un catalogue.

### Sortie JSON structurée (`responseSchema`)
**Décision :** forcer `responseMimeType: "application/json"` + `responseSchema`
(types en MAJUSCULES : `OBJECT`/`ARRAY`/`STRING`/`NUMBER`, requis par l'API).
**Pourquoi :** plus de parsing fragile de texte libre ni de blocs Markdown à
nettoyer ; la réponse est directement exploitable et typée. `temperature: 0.2`
pour des résultats stables et reproductibles.

### Image : multipart **et** base64
**Décision :** accepter à la fois `multipart/form-data` (champ `image`) et un
JSON `{ imageBase64, mimeType }`, convertis en `inlineData` base64 pour Gemini.
**Pourquoi :** souplesse pour le futur frontend (upload de fichier *ou* capture
encodée). Garde-fous : taille ≤ 5 Mo et types autorisés
(`jpeg/png/webp/heic/heif`).

### Routes publiques (non protégées)
**Décision :** `POST` ouverts, comme la recherche du catalogue et l'envoi de
devis — pas de `getCurrentAdmin()`.
**Pourquoi :** ce sont des aides à l'achat côté visiteur. *À surveiller* : la clé
Gemini étant facturée, prévoir du rate-limiting avant une mise en production
(voir « Suites »).

## 4. Vérifications effectuées

- `npx tsc --noEmit` : **0 erreur**.
- `POST /api/ai/search` (live) avec « repeindre une chambre » → renvoie
  *Peinture acrylique 20L* (score 0.9) + *Enduit de lissage 25kg* (score 0.7),
  avec `reason` et `note` en français. Données issues de la base (prix réels).
- `POST /api/ai/identify` (live, multipart image PNG) → pipeline complet OK :
  parsing multipart → base64 → appel multimodal → JSON structuré. Sur une image
  non pertinente, Gemini renvoie `results: []` + `note` explicative (comportement
  attendu, pas d'hallucination).
- Validation : sans `query` → `400` ; sans image → `400` ; type d'image refusé
  → `400`.

## 5. Frontend (volontairement intact)

Aucun composant modifié. Le branchement UI (champ de recherche IA + upload
photo dans le `Catalogue`/`Quiz`) est la **prochaine étape**.

## 6. Suites suggérées

- Brancher le frontend sur les deux routes.
- **Rate-limiting / quota** sur les routes IA (clé facturée) avant production.
- Fusionner les résultats IA avec la recherche locale existante (repli si l'IA
  est indisponible → dégradation gracieuse).
- Cache court des réponses pour les requêtes fréquentes identiques.
