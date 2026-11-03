// Seed a fresh database: default super-admin + two stores + sample catalogue +
// per-store stock + a demo store-manager (gérant) scoped to one store.
// Idempotent — each block checks before inserting, so it's safe to re-run.
// Self-contained (no path aliases) to run under `tsx`.

import { PrismaClient, Prisma } from "@prisma/client";
import crypto from "crypto";

const prisma = new PrismaClient();
const uid = () => crypto.randomBytes(8).toString("hex");

function hash(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const passwordHash = crypto.scryptSync(password, salt, 64).toString("hex");
  return { salt, passwordHash };
}

/** Ensure a store with the given name exists; return its id. */
async function ensureStore(
  name: string,
  data: Omit<Prisma.StoreUncheckedCreateInput, "id" | "name">,
): Promise<string> {
  const found = await prisma.store.findFirst({ where: { name } });
  if (found) return found.id;
  const created = await prisma.store.create({ data: { id: uid(), name, ...data } });
  console.log(`✓ seeded store "${name}"`);
  return created.id;
}

async function main() {
  // --- Super-admin ---
  if ((await prisma.admin.count()) === 0) {
    const { salt, passwordHash } = hash("admin123");
    await prisma.admin.create({ data: { id: uid(), username: "admin", passwordHash, salt, role: "super" } });
    console.log("✓ seeded default admin (admin / admin123)");
  }

  // --- Stores (flagship Daloa + a second branch in Gagnoa) ---
  const daloaId = await ensureStore("Solid-BTP Daloa", {
    city: "Daloa",
    address: "Quartier commercial, Daloa, Haut-Sassandra, Côte d'Ivoire",
    phone: "+225 07 00 00 00 00",
    email: "contact@solid-btp.ci",
    hours: "7j/7 · Lun – Dim · 07h30 – 18h30",
    lat: "6.8772",
    lon: "-6.4502",
    imageUrl: "/brand/front-daloa.jpg",
    note: "Notre magasin historique, au cœur de Daloa.",
  });
  const gagnoaId = await ensureStore("Solid-BTP Gagnoa", {
    city: "Gagnoa",
    address: "Avenue de la Gare, Gagnoa, Gôh, Côte d'Ivoire",
    phone: "+225 07 11 11 11 11",
    email: "gagnoa@solid-btp.ci",
    hours: "Lun – Sam · 08h00 – 18h00",
    lat: "6.1319",
    lon: "-5.9506",
    note: "Succursale de Gagnoa.",
  });

  // --- Sample catalogue ---
  if ((await prisma.article.count()) === 0) {
    const sample: Array<[string, string, string, number]> = [
      ["Climatiseur split 1.5CV", "Inverter classe A, froid puissant pour pièces jusqu'à 25m².", "electromenager", 285000],
      ["Réfrigérateur 2 portes 350L", "Froid ventilé No Frost, faible consommation.", "electromenager", 240000],
      ["Tuyau PVC Ø100 (4m)", "Évacuation eaux usées certifié NF, robuste.", "plomberie", 9500],
      ["Mitigeur lavabo chromé", "Cartouche céramique, mousseur anti-calcaire.", "plomberie", 22000],
      ["Câble électrique 2.5mm² (100m)", "Fil rigide cuivre H07V-U pour installation domestique.", "electricite", 28000],
      ["Disjoncteur 16A courbe C", "Protection modulaire, montage sur rail DIN.", "electricite", 6500],
      ["Peinture acrylique 20L", "Mate, lessivable, grand pouvoir couvrant.", "peinture", 35000],
      ["Enduit de lissage 25kg", "Préparation parfaite des murs avant peinture.", "peinture", 9000],
      ["Perceuse-visseuse 18V", "Sans fil, 2 batteries lithium + mallette de transport.", "outillage", 58000],
      ["Meuleuse d'angle 900W", "Disque 125mm, idéale découpe et ébavurage.", "outillage", 32000],
      ["Serrure 3 points", "Haute sécurité pour porte d'entrée, cylindre européen.", "quincaillerie", 42000],
      ["Vis à bois inox (500 pcs)", "Tête fraisée, filetage total, anticorrosion.", "quincaillerie", 8500],
      ["Ciment CPA 50kg", "Ciment Portland haute résistance pour gros œuvre.", "materiaux", 6500],
      ["Carrelage grès 60x60 (m²)", "Rectifié finition mate, sol et mur.", "materiaux", 12000],
      ["Chauffe-eau électrique 100L", "Cumulus cuve émaillée, résistance stéatite.", "sanitaire", 95000],
      ["WC complet à poser", "Cuvette + réservoir + abattant frein de chute.", "sanitaire", 68000],
    ];
    await prisma.article.createMany({
      data: sample.map(([name, description, category, price]) => ({ id: uid(), name, description, category, price })),
    });
    console.log(`✓ seeded ${sample.length} sample articles`);
  }

  // --- Per-store stock (purchase ≈ 72% of public price, sale = public price) ---
  if ((await prisma.stockItem.count()) === 0) {
    const articles = await prisma.article.findMany();
    const rows: Array<{ id: string; storeId: string; articleId: string; quantity: number; purchasePrice: number; salePrice: number }> = [];
    for (const [i, a] of articles.entries()) {
      // Daloa stocks everything; Gagnoa a rotating subset (~ 2/3).
      for (const [storeId, take] of [[daloaId, true], [gagnoaId, i % 3 !== 0]] as const) {
        if (!take) continue;
        rows.push({
          id: uid(),
          storeId,
          articleId: a.id,
          quantity: 5 + ((i * 7) % 40),
          purchasePrice: Math.round((a.price * 0.72) / 100) * 100,
          salePrice: a.price,
        });
      }
    }
    await prisma.stockItem.createMany({ data: rows });
    console.log(`✓ seeded ${rows.length} stock items`);
  }

  // --- Demo store-manager (gérant), scoped to the Daloa store ---
  let gerant = await prisma.admin.findFirst({ where: { username: "gerant" } });
  if (!gerant) {
    const { salt, passwordHash } = hash("gerant123");
    gerant = await prisma.admin.create({ data: { id: uid(), username: "gerant", passwordHash, salt, role: "sub" } });
    console.log("✓ seeded demo manager (gerant / gerant123)");
  }
  const link = await prisma.adminStore.findFirst({ where: { adminId: gerant.id, storeId: daloaId } });
  if (!link) {
    await prisma.adminStore.create({ data: { id: uid(), adminId: gerant.id, storeId: daloaId } });
    console.log("✓ granted gerant access to Daloa");
  }

  console.log("Seed complete.");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
