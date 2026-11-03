# Journal de décisions — Branchement de l'IA au frontend (3 façons d'ajouter)

**Date :** 2026-06-15
**Auteur :** Claude Code
**Statut :** Livré — vérifié en local (build + test bout-en-bout Playwright)

---

## 1. Objectif

Connecter les routes IA Gemini (créées à l'étape précédente) à l'interface pour
offrir **trois façons d'alimenter le catalogue** :

1. **Ajout rapide** — la liste existante de 35 articles courants (conservée).
2. **Recherche IA (texte)** — l'admin décrit un besoin en français, l'IA propose
   les articles correspondants.
3. **Photo IA** — l'admin prend/importe une photo, l'IA identifie **tous** les
   articles visibles ; aperçu de l'image + liste à **confirmer** avant publication.

Tout doit **persister en base**, avec **spinner** d'attente et **message d'erreur**
convivial.

> Note de gabarit : l'énoncé d'origine parlait de « ce que j'ai mangé » / « suivi
> de calories » (résidu déjà signalé). Adapté au contexte : **article de
> quincaillerie** à ajouter au catalogue. « Sauvegarder une entrée » = créer un
> article via `POST /api/articles`.

## 2. Où la fonctionnalité a été placée — et pourquoi

**Décision :** intégrer les trois modes dans le **tableau de bord admin**
(`components/admin/AdminDashboard.tsx`), pas sur le site public.
**Pourquoi :**
- L'**Ajout rapide** (mentionné comme « à conserver ») y vit déjà ; les trois
  modes forment ainsi un même flux cohérent « Ajouter des articles ».
- « Tout doit persister en base » = **créer des articles**, action **réservée à
  l'admin** (`POST /api/articles` exige `getCurrentAdmin()`). Exposer une écriture
  catalogue au public aurait été un trou de sécurité.

Deux nouveaux onglets : **« Recherche IA »** et **« Photo IA »**, à côté de
« Catalogue », « Ajout rapide », « Équipe », « Demandes ».

## 3. Changement de contrat des routes IA (important)

**Décision :** faire passer `/api/ai/search` et `/api/ai/identify` du mode
*« matcher des articles existants »* (ré-hydratation d'`id`, anti-hallucination,
étape 1) au mode *« proposer des articles à créer »*.
**Pourquoi :** l'objectif réel de l'étape 2 est d'**ajouter de nouveaux articles**
(décrire ou photographier un produit absent du catalogue). Ne renvoyer que des
`id` déjà présents rendait l'enregistrement absurde (doublons) et empêchait la
photo d'« identifier tous les articles » non catalogués.
**Comment :**
- Les routes renvoient désormais `results: ProposedArticle[]`
  (`{ name, description, category, price, reason, confidence }`).
- Le catalogue vivant reste envoyé à Gemini, mais en **référence** (style, rayons,
  ordre de prix) — ce qui ancre les propositions dans la réalité Daloa.
- Garde-fous conservés : sortie **JSON structurée** (`responseSchema` + `enum` de
  rayons), puis **assainissement serveur** `sanitizeProposals()` (rayon forcé à un
  id valide → repli `quincaillerie`, prix entier ≥ 0, champs nettoyés).
- `ProposedArticle` déclaré dans `lib/types.ts` (et ré-exporté par `lib/gemini.ts`)
  pour pouvoir être importé **sans** tirer `next/server` dans le bundle client.

## 4. Ce qui a été construit (frontend)

Dans `AdminDashboard.tsx` :
- Composant `Spinner` inline (SVG `animate-spin`) réutilisé par les deux panneaux.
- **Recherche IA** : zone de texte → `POST /api/ai/search` → cartes de propositions
  (nom, rayon, prix F CFA, justification `↳`) + `note` de conseil ; bouton
  **« + Ajouter »** par carte → `POST /api/articles` → passe à **« Ajouté ✓ »** et
  rafraîchit le catalogue.
- **Photo IA** : `<input type="file" accept="image/*" capture="environment">` →
  **aperçu** de l'image (`FileReader`) → bouton **« Analyser la photo »** →
  `POST /api/ai/identify` (multipart `FormData`) → liste **multi-sélection**
  (cases pré-cochées) + **« Ajouter la sélection (n) »** → création groupée, items
  publiés grisés « ajouté ✓ ». Bouton **« Réinitialiser »**.
- **États** : `aiLoading` / `photoLoading` (spinner + boutons désactivés),
  `aiErr` / `photoErr` (encadré ambre convivial), gestion du cas **0 résultat**
  (message « reformulez / photo plus nette »), limite **5 Mo** vérifiée côté client.

**Frontend public** : inchangé (catalogue, quiz, devis, etc.).

## 5. Vérifications effectuées

- `npx tsc --noEmit` : **0 erreur**.
- `npm run build` : **succès** (les 2 routes `ƒ /api/ai/*` listées ; aucune
  violation de frontière client/serveur).
- Routes (curl, live Gemini) : `search` et `identify` renvoient des
  `ProposedArticle[]` cohérents ; validations `400` (texte vide, image absente,
  format refusé) OK ; image non pertinente → `results: []` + `note`.
- **Bout-en-bout (Playwright)** : connexion admin → onglet « Recherche IA » →
  « je veux carreler une salle de bain de 8 m² » → spinner → **6 propositions**
  (carrelage, colle, joint, croisillons, taloche, coupe-carreau) + note →
  clic « + Ajouter » → bouton « Ajouté ✓ » et **compteur Catalogue 16 → 17**
  (persistance confirmée). Onglet « Photo IA » : rendu OK, **0 erreur console**.

## 6. Compromis & suites

- **Routes publiques, clé facturée** : prévoir **rate-limiting** avant production
  (déjà noté à l'étape 1).
- `confidence` renvoyé par Gemini est parfois `0` ; non bloquant (non affiché,
  non requis). À affiner si on veut trier/filtrer par confiance.
- Les propositions photo ne sont pas éditables avant enregistrement (nom/prix) :
  amélioration possible (édition en ligne avant publication).
- Upload d'image réel pour l'article créé (actuellement `imageUrl` vide) reste au
  backlog.
