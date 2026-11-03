# Journal de décisions — Construction initiale

**Date :** 2026-06-15
**Auteur :** Build initial (Claude Code)
**Statut :** Livré — application fonctionnelle sur `http://localhost:3000`

---

## 1. Objectif

Construire de zéro le site web de **Solid-BTP**, une quincaillerie de bâtiment à
Daloa (Côte d'Ivoire) : une landing page distinctive + un catalogue consultable
par tous, et un espace d'administration permettant de gérer le catalogue et les
comptes administrateurs. Site en français, prix en franc CFA, données
persistantes entre les rafraîchissements.

> Note : l'énoncé d'origine contenait des résidus d'un autre gabarit
> (« cake recommendation », « calorie tracker »). Ils ont été **adaptés au
> contexte quincaillerie** : la reco du quiz propose un *pack matériel* et le
> livrable est bien le site Solid-BTP (et non un suivi de calories).

## 2. Ce qui a été construit

- **Landing page** (`app/page.tsx`) assemblant 8 sections :
  Navbar, Hero, Quiz, Catalogue, Témoignages, Carte (Daloa), Formulaire de devis, Footer.
- **Hero** : nom, slogan « Super Quincaillerie — Tout pour le Bâtiment », image
  de fond (placeholder), stats, bandeau défilant.
- **Quiz « Conseil express »** type Typeform : 3 questions une à une
  (projet / articles avec « Surprenez-moi » / budget en F CFA), barre de
  progression, transitions Framer Motion, puis recommandation personnalisée
  (pack, articles, budget estimé).
- **Catalogue** : récupéré via API, recherche en direct (nom/description/rayon),
  filtres par catégorie avec compteurs, cartes article (nom, description, prix,
  badge rayon, placeholder image).
- **Témoignages** : 3 avis clients.
- **Carte** : intégration OpenStreetMap centrée sur Daloa + bloc coordonnées.
- **Formulaire de devis** : nom, e-mail, téléphone, date souhaitée, message →
  enregistré et visible côté admin.
- **Espace admin** : connexion, CRUD catalogue, ajout rapide (35 articles),
  gestion des comptes avec règles de rôle, consultation des demandes.

## 3. Choix techniques et justifications

### Next.js 16 (App Router) + TypeScript + Tailwind CSS
Imposé par le cahier des charges. App Router pour co-localiser pages et routes
API (`route.ts`) dans un même projet. Démarré en 15.1.6 puis **mis à niveau**
suite à une alerte de sécurité npm (CVE-2025-66478) — npm a résolu vers 16.2.9,
React aligné en 19.x pour la compatibilité des peer-deps. Build de production
vérifié : OK, sans erreur TypeScript.

### Base de données : fichier JSON local (`data/db.json`)
**Décision :** persistance par fichier JSON lu/écrit via `fs`, plutôt que
SQLite (`better-sqlite3`) ou Prisma.
**Pourquoi :**
- **Zéro dépendance native** → pas d'échec de compilation sur Windows
  (le projet tourne sous Windows 11), installation immédiate.
- Répond exactement au besoin : « persiste entre les rafraîchissements ».
- Le fichier est **auto-créé et pré-rempli** au premier accès (`ensureDb` +
  `seed()`), donc aucune étape de migration manuelle.
**Compromis :** pas d'accès concurrent transactionnel ni de requêtes complexes.
Acceptable pour une vitrine/catalogue ; migration vers SQLite/Postgres notée
dans « la suite » pour un usage production.

### Authentification maison (module `crypto` de Node)
**Décision :** hachage **scrypt** (`crypto.scryptSync`) + sessions par token
aléatoire stocké en base et déposé dans un **cookie httpOnly**, plutôt que
`bcrypt` ou NextAuth.
**Pourquoi :** `bcrypt` est une dépendance native (mêmes risques Windows) ;
NextAuth est surdimensionné pour deux rôles internes. `crypto` est intégré à
Node, sûr et suffisant. Comparaison de mots de passe en temps constant
(`timingSafeEqual`).

### Règles de rôle (point sensible du cahier des charges)
Implémentées **côté serveur** dans les routes API (jamais seulement dans l'UI) :
- `POST /api/admins` et `DELETE /api/admins/[id]` exigent le rôle `super`.
- Un compte `super` ne peut **jamais** être supprimé (principal protégé).
- Un `sub` peut gérer le catalogue mais reçoit `403` sur toute action de compte.
Vérifié par tests : super-supprime-super → 403, sub-crée-admin → 403,
sub-supprime-super → 403, sub-édite-catalogue → 201, super-supprime-sub → OK.

### Design « Atelier Industriel » (skill frontend-design)
**Décision :** éviter le rendu « IA générique ». Direction industrielle raffinée :
fond bone/béton, accent **ambre molten `#F2620F`**, anthracite chaud, bleu acier ;
polices **Bricolage Grotesque** (display), **Manrope** (texte), **Space Mono**
(annotations techniques) ; textures *blueprint* (grille) et grain papier, ombres
dures (`shadow-hard`), libellés mono façon plan technique.
**Pourquoi :** cohérent avec l'univers BTP/quincaillerie et mémorable. Polices
distinctives volontairement choisies hors des défauts (Inter/Roboto).

### Carte : OpenStreetMap (iframe)
**Décision :** iframe d'intégration OSM centrée sur Daloa, sans clé API, plutôt
que Google Maps Embed.
**Pourquoi :** la recherche web n'a pas trouvé de fiche publique « Solid-BTP » à
Daloa ; un marqueur sur le centre-ville de Daloa (6.8772, -6.4502) est donc posé,
ajustable facilement via les constantes `LAT`/`LON` de `MapSection.tsx`.
Google Embed aurait nécessité une clé API (friction inutile).

## 4. Vérifications effectuées
- `npm run build` : succès, 0 erreur de type.
- API testées (curl) : seed (16 articles), login bon/mauvais, CRUD article,
  protection 401 sans session, création de sous-admin, soumission de devis,
  et l'ensemble des **règles de rôle**.
- Vérification visuelle (navigateur) : hero, parcours complet du quiz →
  recommandation, catalogue + filtres, et tableau de bord admin après connexion.
- Correctif appliqué après revue visuelle : la navbar passe en **texte clair**
  au-dessus du hero sombre et en texte foncé une fois défilée (lisibilité).
- Favicon SVG ajouté (suppression du 404 `/favicon.ico`).

## 5. Notes de sécurité (démo vs production)
- Identifiants par défaut `admin` / `admin123` — **à changer** avant toute mise
  en ligne réelle.
- Le `GEMINI_API_KEY` présent dans `.env` n'est **pas** utilisé par cette build
  (aucune fonctionnalité IA branchée) ; `.env` reste gitignored.
- Cookies `httpOnly` + `sameSite=lax` ; passer `secure` en production HTTPS.

## 5b. Refonte visuelle (même jour)

Suite à un retour : rendre l'ensemble plus blanc, plus lumineux et plus beau, et
ajouter de vraies images du web (dont une dans le hero).

- **Palette passée en blanc-dominant** : ajout de `snow` (#FFFFFF), `mist`
  (#F6F5F1, sections alternées) et `line` (#E8E5DD, filets). Le `<body>` est
  désormais blanc ; rythme des sections : hero (sombre) → quiz (mist) →
  catalogue (blanc) → avis (sombre) → carte (blanc) → contact (mist) → footer.
- **Cartes blanches** : nouvelle classe `.card` (coins arrondis, filet `line`,
  ombre douce `shadow-card`) remplaçant les bordures dures `shadow-hard` sur le
  catalogue, le quiz, le formulaire de devis et tout le tableau de bord admin.
  Boutons et champs arrondis (`rounded-lg`), puces de filtre en pastilles.
- **Images du web (Unsplash, URLs vérifiées en HTTP 200)** :
  - Hero : image de chantier/plans en fond, révélée par un dégradé latéral
    (lisible à gauche, photo à droite) — `lib/constants.ts › HERO_IMAGE`.
  - Catalogue : une photo représentative **par rayon** sert d'illustration aux
    cartes quand l'article n'a pas d'image propre — `CATEGORY_IMAGES` +
    `categoryImage()`. Zoom doux au survol.
  - Contact : vignette « atelier » dans la colonne de gauche.
- Vérifié visuellement (Playwright) : hero, catalogue, quiz, carte, contact,
  dashboard admin. `tsc --noEmit` : OK.

## 6. Prochaines étapes suggérées
Upload d'images réel · migration base SQLite/Postgres · e-mails sur devis ·
pagination/tri + gestion des stocks · réinitialisation de mot de passe admin.
