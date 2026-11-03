# Journal de décisions — Passe de polissage design (Ralph Loop × frontend-design)

**Date :** 2026-06-15
**Auteur :** Claude Code
**Méthode :** Boucle **Ralph** (review → improve → verify), 3 cycles, vérifiés
contre la skill **frontend-design** + captures **Playwright** desktop (1440px) /
mobile (390px). Build vert à chaque cycle.
**Statut :** Livré — l'app atteint un standard « produit professionnel ».

---

## 1. Objectif

Élever la vitrine Solid-BTP au niveau « vrai produit d'entreprise » : layout
propre, espacements cohérents, palette/typo affirmées, parcours intuitif,
responsive desktop **et** mobile, et tous les « petits détails » (états de
chargement/vide/erreur, interactions, messages clairs).

## 2. Ce que Ralph a trouvé (revue critique)

Le socle était déjà solide (direction « Atelier Industriel » distinctive, typo non
générique, catalogue + IA fonctionnels). Les manques réels :

- 🔴 **Navigation mobile absente** — les liens et l'accès admin étaient
  `hidden md:flex` : sur mobile, seul le logo s'affichait. **Bloquant**.
- 🟠 **Catalogue sans état d'erreur** — un échec de chargement affichait
  « Aucun article trouvé » (trompeur) ; pas de compteur de résultats ni de reset.
- 🟡 **Footer maigre** — pas d'adresse/téléphone/horaires → peu crédible.
- 🟡 **Pas de repères** — aucun indice de défilement au hero, pas d'indicateur de
  section active dans la navbar.
- 🟡 **SEO/social pauvre** — métadonnées minimales (ni OpenGraph ni theme-color).
- ♿ **Accessibilité** — pas de style de focus clavier ni de prise en compte de
  `prefers-reduced-motion`.

## 3. Ce qui a été amélioré (par cycle)

**Cycle 1 — fondamentaux & responsive**
- **Menu mobile** (`Navbar`) : hamburger animé → X, panneau déroulant (liens + CTA
  « Demander un devis » + Espace admin), verrou de scroll body, fermeture auto au
  breakpoint desktop, navbar en surface pleine à l'ouverture.
- **Accessibilité** : `:focus-visible` (anneau ambre) global + `prefers-reduced-motion`.
- Cohérence : CTA secondaire du hero arrondi.

**Cycle 2 — états, crédibilité & repères**
- Catalogue : état **erreur + Réessayer**, **compteur** « N articles », **reset**
  des filtres (lien + état vide).
- **Footer** enrichi (Contact : adresse, téléphone, e-mail, horaires + « ↑ Haut »).
- Hero : **repère « Défiler »** animé (discret, desktop, reduced-motion respecté).

**Cycle 3 — finitions produit & SEO**
- **Métadonnées** : OpenGraph + Twitter + mots-clés + `metadataBase` + `theme-color`.
- Navbar : **scroll-spy** (lien de la section visible surligné en ambre).
- Page de connexion admin revérifiée (déjà soignée — conservée telle quelle).

## 4. Comment la skill frontend-design a validé la qualité

À chaque cycle, le rendu a été confronté au barème frontend-design via captures
Playwright (desktop + mobile) :

- **Typographie / couleur** : direction affirmée (ambre molten + anthracite, polices
  Bricolage Grotesque / Manrope / Space Mono) — pas d'« AI slop » générique. ✅
- **Layout & espacement** : rythme de sections cohérent, grilles alignées,
  compteur + filtres bien hiérarchisés ; rien d'aléatoire. ✅
- **Intuitivité** : navigation claire desktop **et** mobile (menu + scroll-spy),
  CTA explicites, repère de défilement. ✅
- **Responsive** : hero, catalogue (assistant IA + grille), formulaire et footer
  vérifiés nets à 390 px ; menu mobile lisible. ✅
- **Petits détails** : squelettes de chargement, états vide/erreur+réessayer,
  spinners IA, messages d'erreur conviviaux, focus clavier, micro-interactions,
  `prefers-reduced-motion`. ✅

Captures de contrôle prises : baseline (desktop/mobile), menu mobile, catalogue
desktop/mobile + compteur, footer enrichi, scroll-spy actif. (Artefacts de test
supprimés après vérification.)

## 5. Vérifications finales

- `npm run build` : **succès** à chaque cycle (0 erreur TypeScript).
- Conventions respectées : tout en **français**, prix en **F CFA**.
- Documentation : `CLAUDE.md` réécrit (**129 lignes**, < 200) avec section
  **Next Steps** ; `PLAN.md` (What We Built / What We Improved / Future Roadmap).

## 6. Suites (voir CLAUDE.md › Next Steps)
Déploiement Vercel (persistance + throttle gérés), historique & graphiques,
préférences utilisateur, scan de code-barres.
