// Shared, framework-agnostic constants used by both client and server.

export interface Category {
  id: string;
  label: string;
  blurb: string;
}

/** Catalogue sections ("electro menager" etc.). */
export const CATEGORIES: Category[] = [
  { id: "electromenager", label: "Électroménager", blurb: "Froid, cuisson & confort" },
  { id: "plomberie", label: "Plomberie", blurb: "Tuyauterie & raccords" },
  { id: "electricite", label: "Électricité", blurb: "Câblage & éclairage" },
  { id: "peinture", label: "Peinture & Droguerie", blurb: "Finitions & enduits" },
  { id: "outillage", label: "Outillage", blurb: "Manuel & électroportatif" },
  { id: "quincaillerie", label: "Quincaillerie", blurb: "Visserie & ferronnerie" },
  { id: "materiaux", label: "Matériaux de Construction", blurb: "Gros œuvre & second œuvre" },
  { id: "sanitaire", label: "Sanitaire", blurb: "Équipements & robinetterie" },
];

export function categoryLabel(id: string): string {
  return CATEGORIES.find((c) => c.id === id)?.label ?? id;
}

/**
 * Color-coded rayons — the signature of the design. Each department carries its
 * own friendly hue (matching the `.rayon-stripe` order), surfaced on chips and
 * card accents. Colors are passed inline since they're data-driven.
 */
export const CATEGORY_COLORS: Record<string, string> = {
  electromenager: "#2BA8CC", // azure
  plomberie: "#3B82F6",      // blue
  electricite: "#FFC233",    // yellow
  peinture: "#E8487A",       // berry
  outillage: "#FF6A1A",      // orange
  quincaillerie: "#8B5CF6",  // grape
  materiaux: "#16A34A",      // green
  sanitaire: "#06B6D4",      // cyan
};

export function categoryColor(id: string): string {
  return CATEGORY_COLORS[id] ?? "#FF6A1A";
}

/** Representative photo per rayon (Unsplash). Used as catalogue fallback imagery. */
const UNSPLASH = (id: string, w = 1000) =>
  `https://images.unsplash.com/photo-${id}?q=80&w=${w}&auto=format&fit=crop`;

export const CATEGORY_IMAGES: Record<string, string> = {
  electromenager: UNSPLASH("1556911220-bff31c812dba"),
  plomberie: UNSPLASH("1607472586893-edb57bdc0e39"),
  electricite: UNSPLASH("1558618666-fcd25c85cd64"),
  peinture: UNSPLASH("1562259949-e8e7689d7828"),
  outillage: UNSPLASH("1530124566582-a618bc2615dc"),
  quincaillerie: UNSPLASH("1581244277943-fe4a9c777189"),
  materiaux: UNSPLASH("1607400201889-565b1ee75f8e"),
  sanitaire: UNSPLASH("1584622650111-993a426fbf0a"),
};

export function categoryImage(id: string): string {
  return CATEGORY_IMAGES[id] ?? "";
}

/** Hero background image — scène construction & quincaillerie de la marque. */
export const HERO_IMAGE = "/brand/hero-store.png";

/** Logo officiel Solid-BTP, fond transparent (PNG détouré).
 *  `LOGO_LIGHT` = artwork sombre → surfaces claires ;
 *  `LOGO_DARK` = artwork clair → surfaces sombres (ambiance Minuit). */
export const LOGO_LIGHT = "/brand/logo-light.png";
export const LOGO_DARK = "/brand/logo-dark.png";

/** Storefront photo of the flagship Daloa shop (used to seed its store entry). */
export const STORE_DALOA_IMAGE = "/brand/front-daloa.jpg";

/** Quick-add list (20+ common articles) for the admin dashboard. */
export interface QuickArticle {
  name: string;
  description: string;
  category: string;
  price: number;
}

export const QUICK_ARTICLES: QuickArticle[] = [
  { name: "Peinture acrylique 20L", description: "Peinture murale mate intérieur/extérieur, grand pouvoir couvrant.", category: "peinture", price: 35000 },
  { name: "Pinceau plat 50mm", description: "Soies synthétiques pour finitions nettes.", category: "peinture", price: 1500 },
  { name: "Rouleau anti-goutte", description: "Manchon polyamide + monture, idéal grandes surfaces.", category: "peinture", price: 3500 },
  { name: "Enduit de lissage 25kg", description: "Enduit poudre pour murs et plafonds.", category: "peinture", price: 9000 },
  { name: "Ciment CPA 50kg", description: "Ciment Portland haute résistance.", category: "materiaux", price: 6500 },
  { name: "Fer à béton 12mm", description: "Barre haute adhérence, longueur 12m.", category: "materiaux", price: 7800 },
  { name: "Sable fin (m³)", description: "Sable lavé pour mortier et enduit.", category: "materiaux", price: 18000 },
  { name: "Marteau de menuisier", description: "Tête acier forgé, manche fibre anti-choc.", category: "outillage", price: 4500 },
  { name: "Tournevis (jeu de 6)", description: "Plats et cruciformes, embouts magnétiques.", category: "outillage", price: 6000 },
  { name: "Perceuse-visseuse 18V", description: "Sans fil, 2 batteries lithium + mallette.", category: "outillage", price: 58000 },
  { name: "Disqueuse 125mm", description: "Meuleuse d'angle 900W, poignée latérale.", category: "outillage", price: 32000 },
  { name: "Mètre ruban 5m", description: "Ruban acier laqué, blocage automatique.", category: "outillage", price: 2500 },
  { name: "Niveau à bulle 60cm", description: "Profilé aluminium, 3 fioles.", category: "outillage", price: 7000 },
  { name: "Scie égoïne", description: "Lame trempée 500mm, denture universelle.", category: "outillage", price: 3800 },
  { name: "Boîte de clous assortis", description: "Clous acier galvanisé, tailles variées 2kg.", category: "quincaillerie", price: 4000 },
  { name: "Vis à bois (500 pcs)", description: "Tête fraisée, filetage total, inox.", category: "quincaillerie", price: 8500 },
  { name: "Cadenas blindé 50mm", description: "Anse acier cémenté, 3 clés.", category: "quincaillerie", price: 5500 },
  { name: "Serrure 3 points", description: "Sécurité porte d'entrée, cylindre européen.", category: "quincaillerie", price: 42000 },
  { name: "Charnières inox (paire)", description: "Gonds 100mm pour portes lourdes.", category: "quincaillerie", price: 3000 },
  { name: "Tuyau PVC Ø100 (4m)", description: "Évacuation eaux usées, NF.", category: "plomberie", price: 9500 },
  { name: "Robinet mélangeur", description: "Mitigeur lavabo chromé, cartouche céramique.", category: "plomberie", price: 22000 },
  { name: "Coude PVC 90° Ø40", description: "Raccord évacuation, lot de 10.", category: "plomberie", price: 4500 },
  { name: "Câble électrique 2.5mm² (100m)", description: "Fil rigide cuivre H07V-U.", category: "electricite", price: 28000 },
  { name: "Interrupteur va-et-vient", description: "Mécanisme complet + plaque blanche.", category: "electricite", price: 2800 },
  { name: "Ampoule LED 12W", description: "Culot E27, blanc chaud, 1200 lumens.", category: "electricite", price: 2200 },
  { name: "Disjoncteur 16A", description: "Protection circuit, courbe C, modulaire.", category: "electricite", price: 6500 },
  { name: "Carrelage 60x60 (m²)", description: "Grès cérame rectifié, finition mate.", category: "materiaux", price: 12000 },
  { name: "Colle à carrelage 25kg", description: "Mortier-colle flex pour sol et mur.", category: "materiaux", price: 7500 },
  { name: "Brouette 100L", description: "Cuve acier renforcé, roue gonflable.", category: "outillage", price: 38000 },
  { name: "Casque de chantier", description: "Coque ABS, conforme EN 397, jugulaire.", category: "quincaillerie", price: 4500 },
  { name: "Gants de protection (paire)", description: "Enduction nitrile, préhension renforcée.", category: "quincaillerie", price: 1800 },
  { name: "Climatiseur split 1.5CV", description: "Inverter, classe énergétique A, froid seul.", category: "electromenager", price: 285000 },
  { name: "Chauffe-eau 100L", description: "Cumulus électrique, cuve émaillée.", category: "electromenager", price: 95000 },
  { name: "Lavabo céramique", description: "Vasque blanche sur colonne, bonde incluse.", category: "sanitaire", price: 32000 },
  { name: "WC complet à poser", description: "Cuvette + réservoir + abattant, sortie horizontale.", category: "sanitaire", price: 68000 },
];
