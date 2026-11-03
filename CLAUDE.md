# Solid-BTP

Site vitrine + catalogue en ligne pour **Solid-BTP**, une quincaillerie de
bâtiment à Daloa (Côte d'Ivoire). Slogan : *« Super Quincaillerie — Tout pour le
Bâtiment »*. Interface entièrement en **français**, prix en **franc CFA**.

## Ce que fait l'application

**Côté public (visiteur)**
- Hero immersif (nom, slogan, image de fond, stats, repère de défilement).
- Quiz « Conseil express » type Typeform (3 questions animées) → *pack matériel*
  personnalisé selon projet, besoin (option « Surprenez-moi ») et budget F CFA.
- Catalogue dynamique : **recherche en direct**, filtres par rayon avec compteurs,
  **compteur de résultats**, états *chargement / vide / erreur+réessayer*.
- **Assistant IA dans le catalogue** : décrire un projet en français *ou* envoyer
  une photo → Gemini retrouve les articles **existants** correspondants (avec
  justification), affichés à la place de la grille (bouton « Effacer »). Spinner,
  message d'erreur convivial, invite au devis si rien ne correspond. Lecture seule.
- Avis clients (3 témoignages), carte OpenStreetMap (Daloa), formulaire de devis.

**Côté administrateur** (`/admin`) — **ERP « Sage simplifié » multi-magasins**
Coquille role-aware à barre latérale (`components/admin/AdminShell.tsx` + contexte
`AdminContext`), un module par fonction (`components/admin/modules/*`), **en français
uniquement** (hors next-intl). Sélecteur de magasin (gérant) / périmètre (super).

- **Gérant (sous-admin)** — opère uniquement les magasins que l'admin principal lui
  attribue (`AdminStore`). Modules : **Tableau de bord** (KPI + diagrammes),
  **Factures**, **Devis en ligne**, **Clients**, **Fournisseurs**, **Stock**,
  **Catalogue**, **Employés**, **Cahier de jour**.
  - **Factures** typées + n° **auto-incrémenté par magasin & type** (Fan/Far/Faa/Facr/Fad,
    `lib/invoicing.ts`) ; lignes, total HT, taxe, TTC ; **vue imprimable** + export CSV.
  - Les factures **crédit (Facr)** et **avoir (Faa)** créent/mettent à jour
    **automatiquement** le compte client et son **solde** (`applyCustomerEffect`).
  - **Devis en ligne** : conversion **IA** (toute langue → FR) d'une demande en lignes
    chiffrées éditables → facture **Fad** (`POST /api/ai/quote`).
  - **Stock** par magasin (prix d'achat/vente, quantités) + **recherche cross-magasin**
    (quels autres magasins ont le produit). **Fournisseurs** (soldes dus).
    **Employés** (salaires, avances, soldes, embauche/renvoi).
  - **Cahier de jour** : versements clients (+), dépenses catégorisées (gazoil,
    journaliers, déchargement, pont bascule, autre) (−), avances (−), versements
    Solid-BTP (−). Totaux, filtres, export/impression.
- **Admin principal (super)** — supervision réseau, accès à tout. Modules :
  **Vue globale** — un **tableau de bord unique et dynamique** du réseau qui regroupe
  toutes les analyses, chaque section ayant un **style différent** : bandeau KPI en
  dégradé, ventes (courbe + barres), crédits & dettes (classements + camembert),
  avoirs Faa & retours Far (tableau comparatif inter-magasins), personnel/avances,
  dépenses (camembert + barres), et un **classement interactif** (bascule de métrique :
  revenus, crédits accordés, dettes, avances, dépenses, performance). Plus :
  **Magasins** (CRUD + création), **Sous-admins** (création/suppression + attribution
  des magasins), **Catalogue**, **Factures**, **Crédits**, **Fournisseurs**, **Dépenses**
  (filtrables, ex. gazoil), **Cahiers de jour**, **Mon compte** (identifiants).
- Connexion sécurisée (cookie httpOnly, scrypt). Contrôle d'accès : `lib/access.ts`
  (`requireAdmin`/`requireSuper`/`accessibleStoreIds`/`assertStoreAccess`).
- Diagrammes **React/SVG maison** (`components/admin/charts.tsx`) avec **infobulles
  au survol** : histogramme, aire, barres, camembert (donut), radar multi-axes, +
  classements horizontaux. Alimentés par `GET /api/stats/store` et `/api/stats/global`
  (skill `dashboard-creator` comme modèle visuel).

## Design & UX
- Direction **« Atelier Néo »** : clair, futuriste et premium. Base blanc-soleil
  (`sun`) ; **glassmorphism** partout (`.glass`, `.glass-card` : verre dépoli +
  flou + reflet interne), **dégradés mesh aurora** (`.mesh`) et **blobs** colorés
  qui dérivent en fond. Accent chaud signature orange `#FF6A1A` + accents froids
  futuristes **violet** `#7C5CFF` et **cyan** `#22D3EE` (utilisés en dégradés,
  lueurs et bordures plutôt qu'en aplats). **Aucun grand aplat sombre** ; pas de
  barres de couleur pleines.
- **Signature** : dégradé **holographique** animé orange→violet→cyan (`.text-holo`
  sur le titre, `.accent-line` en filets fins) + surfaces de verre lumineuses.
- **Hero** : **photo plein cadre en fond**, titre holographique, cartes de stats et
  carte note/horaires en **verre dépoli flottant**, marquee en verre.
  (`CATEGORY_COLORS`/`categoryColor()` conservés pour de discrètes pastilles.)
- **Ambiances (fond de toute la page)** : `components/Ambiance.tsx` fournit un
  contexte + un **fond fixe plein écran** (la photo de la marque reste visible dans
  **toutes** les ambiances, sous un voile coloré) et un **sélecteur dans la navbar**.
  Quatre choix : **Atelier** (défaut, aurora chaude), **Minuit** (bleu nuit futuriste —
  vrai mode sombre), **Ivoire**, **Gris clair**. Le choix est **persistant**
  (localStorage). Les sections utilisent `.veil` (surface translucide floutée) pour
  laisser voir le fond. Le mode sombre est appliqué via un bloc CSS **non-calqué**
  ciblé `[data-ambiance="minuit"]` dans `globals.css` (ne touche que la landing).
- Typographie distinctive : **Bricolage Grotesque** (display), **Manrope** (texte),
  **Space Mono** (annotations techniques).
- **Responsive** desktop + mobile : navbar avec **menu hamburger** (panneau
  déroulant + CTA devis), **scroll-spy** (lien de section actif).
- Détails : `:focus-visible` (anneau ambre), `prefers-reduced-motion`, reveals au
  scroll (Framer Motion), squelettes de chargement, micro-interactions.

## Démarrer
```bash
npm install
# Renseigner .env (voir .env.example) : DATABASE_URL (PostgreSQL) + GEMINI_API_KEY
npm run db:migrate   # crée le schéma Postgres (Prisma)
npm run db:seed      # admin + 2 magasins (Daloa, Gagnoa) + 16 articles + stock + gérant de démo
npm run dev          # http://localhost:3000
```
Autres scripts : `npm run build`, `npm start`, `npm run db:studio` (explorateur de
base), `npm run db:import` (migre un ancien `data/db.json` vers Postgres).

**Identifiants par défaut :** `admin` / `admin123` (principal) · `gerant` / `gerant123`
(gérant de démo, accès au magasin Daloa) — accès `/admin/login`.
Clés attendues dans `.env` → `DATABASE_URL` et `GEMINI_API_KEY`.

## Stack technique
- **Next.js 16** (App Router) + **React 19** + **TypeScript**.
- **Tailwind CSS v3** (design system maison « Atelier Lumineux ») ; **Framer Motion**.
- **Base de données : PostgreSQL via Prisma** (`prisma/schema.prisma`, client
  généré, requêtes typées). Accès centralisé par `lib/prisma.ts` (singleton).
- **Auth maison** : module `crypto` de Node (scrypt + sessions en cookie).
- **OpenStreetMap** (iframe, sans clé) pour la carte.
- **IA : Google Gemini** (`gemini-2.5-flash-lite`) en **REST via `fetch`** (aucun SDK).

> Migré d'une persistance fichier (`data/db.json`) vers Postgres. Les ids restent
> en hex 16 (`lib/db.ts#newId`, passés explicitement à `create`) ; `scripts/import-from-json.ts`
> rejoue un ancien `data/db.json` dans Postgres en conservant ids et horodatages.

## Structure du projet
```
app/
  layout.tsx            # polices + métadonnées/SEO (OpenGraph, theme-color)
  page.tsx              # landing : assemble toutes les sections
  globals.css           # design system (couleurs, .btn, .field, focus, textures)
  admin/{login/page.tsx, page.tsx}        # connexion + garde d'auth -> dashboard
  api/
    auth/{login,logout,me}/route.ts
    articles/route.ts + [id]/route.ts     # GET public, POST/PUT/DELETE protégés
    admins/route.ts + [id]/route.ts       # gestion des comptes (règles de rôle)
    orders/route.ts                       # POST public, GET protégé
    ai/{search,identify}/route.ts         # IA texte + photo (modes match/propose)
  api/                                    # routes ERP : invoices, customers, suppliers,
                                          # stock(+search), employees(+tx), daybook,
                                          # stats/{store,global}, ai/quote, admins/me,
                                          # admins/[id]/stores, */export (CSV)
  admin/invoices/[id]/print/page.tsx      # facture imprimable (autonome, @media print)
components/
  Navbar, Hero, Quiz, Catalogue, Testimonials, MapSection, ContactForm, Footer
  admin/AdminShell.tsx + AdminContext.tsx # coquille ERP role-aware + contexte (magasin actif)
  admin/ui.tsx · charts.tsx               # UI partagée + diagrammes React/SVG
  admin/modules/*                         # un module par fonction (factures, clients, stock,
                                          # catalogue avec Recherche IA + Photo IA, …)
lib/
  types.ts · constants.ts · db.ts (newId) · auth.ts · format.ts
  erp.ts             # constantes métier FR (types factures, dépenses, mvts employés)
  access.ts          # contrôle d'accès par magasin (requireAdmin/Super, scoping)
  invoicing.ts       # numérotation auto + tenue auto des comptes clients
  csv.ts             # export Excel (CSV ; ; BOM UTF-8)
  prisma.ts          # client Prisma (singleton ancré sur globalThis)
  gemini.ts          # wrapper REST Gemini + match/propose/quote
  rate-limit.ts      # throttle par IP (en mémoire, globalThis) des routes IA
prisma/
  schema.prisma      # modèles Postgres (cf. Modèle de données)
  seed.ts            # admin + 2 magasins + articles + stock + gérant de démo, idempotent
scripts/
  import-from-json.ts # migration unique data/db.json -> Postgres
docs/                # journaux de décisions datés
```

## Modèle de données (PostgreSQL — `prisma/schema.prisma`)
- `admins` — `{ id, username, passwordHash, salt, role: "super"|"sub", createdAt }`
- `admin_stores` — `{ id, adminId, storeId }` (accès gérant→magasins ; super = tous)
- `articles` — `{ id, name, description, category, price, imageUrl, createdAt }` (produit global)
- `stock_items` — `{ id, storeId, articleId, quantity, purchasePrice, salePrice, … }` (stock/prix par magasin)
- `customers` — `{ id, storeId, name, phone, address, email, balance(signé), … }`
- `invoices` — `{ id, storeId, type, number, seq, date, customerId?, customerName/Phone/Address, subtotal, tax, total, note, createdById, … }`
- `invoice_items` — `{ id, invoiceId, articleId?, label, quantity, unitPrice, lineTotal }`
- `invoice_counters` — `{ id, storeId, type, lastSeq }` (numérotation auto par magasin+type)
- `suppliers` — `{ id, storeId, name, phone, email, address, balance, note, … }`
- `employees` — `{ id, storeId, name, position, phone, baseSalary, balance, status, … }`
- `employee_txs` — `{ id, employeeId, type(salary|advance|adjustment), amount, date, note }`
- `daybook_entries` — `{ id, storeId, date, kind(payment|expense|advance|deposit), category, label, amount, … }`
- `orders` — `{ id, name, email, phone, dateNeeded, message, storeId, createdAt }` (devis en ligne reçus)
- `stores` — `{ id, name, city, address, phone, email, hours, lat, lon, imageUrl, note, createdAt }`
- `sessions` — `{ token, adminId, createdAt }`

> Ids = hex 16 (`newId`), prix entiers en F CFA (XOF, sans décimale). `storeId`
> sur `orders` = magasin destinataire (chaîne libre, `""` si aucun).

## Conventions
- Tout le contenu visible est en **français** ; prix en **F CFA**.
- Les `category` sont des **id** (`electromenager`, …) ; libellé via `categoryLabel()`.
- Les routes API mutantes vérifient `getCurrentAdmin()` ; la gestion des comptes
  exige en plus le rôle `super`.

## Recherche IA (Gemini)
Deux routes `POST` (`gemini-2.5-flash-lite`), sortie en **JSON structuré**
(`responseSchema`). Logique commune dans `lib/gemini.ts`. Champ `mode` :
- **`match`** (public) : retrouve des articles **existants** ; les `id` sont
  **ré-hydratés** depuis la base → données réelles (`MatchedArticle[]`).
- **`propose`** (admin, défaut) : **propose de nouveaux** articles, **assainis**
  (`sanitizeProposals` : rayon valide, prix entier ≥ 0) → `ProposedArticle[]`.

| Route | Entrée | Sortie |
|---|---|---|
| `POST /api/ai/search` | `{ query, mode? }` | `{ query, mode, note, results }` |
| `POST /api/ai/identify` | `multipart` (`image` ≤ 5 Mo, `mode`) ou JSON base64 | `{ mode, note, results }` |

Erreurs : `400` (entrée), `500` (clé absente), `502` (Gemini KO), `429` (quota).
**Limitation de débit** (`lib/rate-limit.ts`) : budget **par IP** partagé par les
deux routes (défaut **10/min**), vérifié *avant* tout traitement → `429` +
`Retry-After`. État en mémoire ancré sur `globalThis` (survit à l'isolation des
bundles et au HMR) ; pour du multi-instance, passer à un store partagé (Redis).

## Next Steps
- **Déploiement Vercel** : Postgres géré (Supabase/Neon) déjà en place ; reste à
  migrer le throttle IA vers un store partagé (Upstash/Redis) et les images
  (`public/uploads`) vers un stockage objet (le FS n'est pas persistant en serverless).
- **Historique & graphiques** : suivi des demandes de devis / articles vus,
  tableaux de bord avec courbes (tendances catalogue, top rayons).
- **Préférences utilisateur** : rayons favoris, devis sauvegardés, thème, langue.
- **Scan de code-barres** : ajout/recherche d'article par scan (caméra) côté admin.
- Upload d'images réel · notifications e-mail sur devis · pagination/tri & stocks ·
  réinitialisation de mot de passe admin.
