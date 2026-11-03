# Solid-BTP — Plan & Journal de polissage

Polissage mené en **boucle Ralph** (review → improve → verify), chaque cycle
vérifié contre la **skill frontend-design** et par captures **Playwright**
desktop (1440 px) + mobile (390 px). Build vérifié vert à chaque cycle.

---

## What We Built

Application Next.js 16 (App Router) / React 19 / TypeScript / Tailwind v3 pour la
quincaillerie **Solid-BTP** (Daloa, Côte d'Ivoire) — français, prix en F CFA.

- **Vitrine publique** : hero immersif, quiz « Conseil express », catalogue
  filtrable avec recherche en direct, témoignages, carte OpenStreetMap, devis.
- **Assistant IA (Gemini `gemini-2.5-flash-lite`)** :
  - *Public* — recherche texte/photo qui retrouve les articles **existants** du
    catalogue (mode `match`, anti-hallucination, lecture seule).
  - *Admin* — 3 façons d'ajouter des articles (ajout rapide, Recherche IA, Photo IA,
    mode `propose`) avec confirmation et persistance.
- **Espace admin** : auth scrypt + sessions cookie, CRUD catalogue, gestion
  d'équipe (rôles super/sub), consultation des devis.
- **Backend** : base JSON locale (`fs`), routes API protégées, throttle IA par IP.
- **Design « Atelier Industriel »** : palette blanc + ambre molten, typo Bricolage
  Grotesque / Manrope / Space Mono, textures blueprint & grain, Framer Motion.

## What We Improved

### Cycle 1 — Fondamentaux d'usage & responsive
- 🔴 **Aucune navigation mobile** (liens `hidden md:flex`) → ajout d'un **menu
  hamburger** animé (→ X), panneau déroulant (liens + CTA devis + admin), verrou
  de scroll, fermeture auto au passage desktop ; navbar en surface pleine à l'ouverture.
- ♿ **Accessibilité** : `:focus-visible` (anneau ambre) sur tous les interactifs ;
  respect de `prefers-reduced-motion`.
- 🎯 Cohérence : CTA secondaire du hero arrondi pour s'aligner sur les boutons.

### Cycle 2 — États, crédibilité & repères
- 🟠 Catalogue : ajout d'un **état d'erreur** dédié + **Réessayer** (avant : un
  échec API affichait « Aucun article trouvé », trompeur) ; **compteur de résultats**
  « N articles » ; lien **réinitialiser** (filtre/recherche actifs) + reset dans l'état vide.
- 🏢 **Footer enrichi** : colonne Contact (adresse, téléphone, e-mail, horaires)
  + lien **↑ Haut** → crédibilité « entreprise réelle ».
- 🎬 Hero : **repère « Défiler »** animé, discret (desktop), reduced-motion respecté.

### Cycle 3 — Finitions produit & SEO
- 🔎 **Métadonnées/SEO** : OpenGraph, Twitter card, mots-clés, `metadataBase`,
  `theme-color`, titre en template — partage social propre.
- 🧭 Navbar : **scroll-spy** (lien de la section visible mis en évidence en ambre).
- 🔐 Vérification de la page de connexion admin (déjà soignée — conservée).

### Cycle 4 — Refonte « Atelier Lumineux » (plus claire & plus belle)
- 🎨 **Palette allégée** : base `cloud`/`mist`, bordures et ombres adoucies,
  ambre signature + **secondaire `sky`** doux (frais, parcimonieux), `ink` adouci.
- ☀️ **Moins de blocs sombres** : hero **éclairci** (photo plus visible, double halo
  ambre + sky) ; **Témoignages passés en clair** (cartes blanches, citations,
  avatars dégradés) ; quiz/contact en dégradés clairs ; panneau Assistant IA tinté
  (ambre→sky). **Hero repensé en clair** (canvas bone→cloud, photo en carte
  encadrée + puces flottantes, cartes de stats) — navbar en texte sombre adaptée.
- 🏜️ **Bandeaux « sable » assortis** : hero **et** footer partagent un canvas
  `sand`/`sand-deep` (avec halo ambre + ligne d'accent) qui ressort du corps
  blanc — effet bookend chaleureux ; footer repassé en texte sombre.
- 🖼️ **Hero en photo plein cadre** : nouvelle image d'artisan (chaleureuse, locale),
  posée en **fond plein cadre** (miroir → sujet à droite) sous un **voile sable
  dégradé** (clair et lisible à gauche, photo nette à droite) + carte flottante
  note/horaires. Navbar adaptée.
- ✨ **Ergonomie/finitions** : boutons & champs plus arrondis (`rounded-xl`),
  CTA en dégradé, badges arrondis, dividers en dégradé.
- 🕒 **Horaires** : ouvert **7j/7 · Lun – Dim · 07h30 – 18h30** (Footer + carte ;
  note de contact alignée).
- ✅ Vérifié (Playwright desktop + mobile) : hero/témoignages/catalogue/carte plus
  lumineux, lisibilité conservée ; build vert.

**Vérification frontend-design (synthèse) :** layout propre et aéré, espacements
cohérents, palette/typo affirmées et non génériques, parcours intuitif (mobile inclus),
rien d'aléatoire, responsive desktop/mobile, et les « petits détails » présents
(chargement, vide, erreur, spinners IA, focus clavier, micro-interactions). ✅

## Future Roadmap
- **Déploiement Vercel** : persistance gérée (KV/Postgres) au lieu du JSON local ;
  throttle IA sur store partagé (Upstash/Redis).
- **Historique & graphiques** : courbes des demandes de devis et des articles
  consultés ; tableaux de bord (tendances, top rayons).
- **Préférences utilisateur** : rayons favoris, devis sauvegardés, thème, langue.
- **Scan de code-barres** : ajout/recherche d'article par caméra (admin).
- Upload d'images réel · e-mails sur devis · pagination/tri & gestion de stocks ·
  réinitialisation de mot de passe admin.
