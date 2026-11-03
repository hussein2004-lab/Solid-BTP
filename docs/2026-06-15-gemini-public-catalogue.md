# Journal de décisions — Assistant IA dans le catalogue public

**Date :** 2026-06-15
**Auteur :** Claude Code
**Statut :** Livré — vérifié en local (build + test bout-en-bout Playwright)

---

## 1. Objectif

Rendre la recherche IA (texte + photo) accessible aux **visiteurs** directement
dans le navigateur de catalogue de la page d'accueil — jusqu'ici l'IA n'existait
que côté admin.

## 2. Décision clé : un mode « match » distinct du mode « propose »

Un visiteur **n'est pas authentifié** et ne doit **jamais créer** d'article
(`POST /api/articles` reste réservé à l'admin). L'usage public n'est donc pas
« proposer de nouveaux articles » mais **retrouver des articles que la boutique
vend réellement**, afin que le client puisse les voir (vrai prix, vraie image) et
les commander via le formulaire de devis.

**Décision :** ajouter un champ `mode` aux deux routes IA plutôt que créer des
routes séparées (DRY, même validation/erreurs) :
- `mode: "match"` → Gemini renvoie des **`id` existants** du catalogue, ré-hydratés
  depuis la base (`hydrateMatches`) → `MatchedArticle[]` (un `Article` réel +
  `reason` + `score`). Anti-hallucination : les `id` inconnus sont écartés.
- `mode: "propose"` (**défaut**, inchangé) → `ProposedArticle[]` pour l'admin.

Ainsi le catalogue public appelle `mode: "match"` ; le dashboard admin garde son
comportement (`propose`) sans aucune modification.

> C'est un retour partiel à la logique de l'étape 1 (ré-hydratation d'`id`), mais
> coexistant avec le mode `propose` de l'étape 2 — d'où le paramètre `mode`.

## 3. Ce qui a été construit

### Backend (`lib/gemini.ts`, routes)
- `catalogueContextWithIds()` : rendu du catalogue **avec `id`** (le contexte du
  mode `propose` ne les exposait plus).
- `hydrateMatches()` + `MATCHES_SCHEMA` (ré)introduits ; type `MatchedArticle`
  ajouté à `lib/types.ts`.
- `app/api/ai/search` et `app/api/ai/identify` : branche `if (mode === "match")`
  (prompt « sélectionne dans le catalogue, n'invente rien ») vs `propose`.
  La réponse inclut désormais `mode` pour traçabilité.

### Frontend public (`components/Catalogue.tsx`)
- Panneau **« Assistant IA »** sous l'en-tête : zone de texte + bouton
  « Demander à l'IA », et bouton **📷 Photo** (`<input capture="environment">`).
- Appels en `mode: "match"` (`/api/ai/search` JSON, `/api/ai/identify` multipart).
- **Résultats** : remplacent la grille normale (et masquent le rail de catégories),
  précédés d'un bandeau « N article(s) suggéré(s) · pour … » + la `note` de conseil
  + **aperçu** de la photo le cas échéant + bouton **« Effacer »** pour revenir à la
  navigation classique. Chaque carte affiche la **justification IA** (`✦ …`).
- **Spinner** pendant l'appel, **message d'erreur** convivial, garde-fou 5 Mo, et
  cas « 0 résultat » → invitation à **demander un devis** (lien `#contact`).
- La recherche instantanée locale et les filtres par rayon restent inchangés.

## 4. Vérifications

- `npx tsc --noEmit` : **0 erreur**. `npm run build` : **succès**.
- Routes (curl, live Gemini) :
  - `search` `mode:"match"` « je dois faire de la peinture » → renvoie les vrais
    articles *Peinture acrylique 20L* / *Enduit de lissage 25kg* (avec `id`,
    `price`, `score`).
  - `search` **sans** `mode` → toujours `mode:"propose"`, résultats **sans `id`**
    (admin intact).
- **Bout-en-bout (Playwright, page publique)** : panneau « Assistant IA » visible →
  « je veux fixer une étagère lourde au mur » → spinner → bandeau « 3 article(s)
  suggéré(s) » + note + cartes réelles (Vis à bois inox, Perceuse-visseuse…) avec
  justification → clic « Effacer » → retour à la grille complète (17 articles) et
  au rail de catégories.

## 5. Compromis & suites

- Routes publiques + clé facturée → **rate-limiting** à prévoir avant prod (déjà
  noté aux étapes précédentes ; d'autant plus pertinent côté public).
- Le mode `match` ne propose que l'existant : si la boutique n'a pas l'article, on
  oriente vers le devis (choix volontaire, pas d'invention de prix côté client).
- Piste : fusionner résultats IA et filtres (ex. affiner les résultats IA par
  rayon), et repli automatique sur la recherche locale si l'IA est indisponible.
