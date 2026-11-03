// Génère un devis estimatif réaliste « offre lancement » (jeune entreprise) pour
// l'application Solid-BTP, prêt à imprimer en PDF. Tarifs freelance locaux
// (Afrique francophone), paliers gratuits la 1re année, remise lancement.
// Montants nets en F CFA (XOF) ; équivalent EUR au taux fixe 1 € = 655,957 XOF.
import fs from "fs";
import path from "path";

const root = process.cwd();
const EUR = 655.957;
const xof = (n) => new Intl.NumberFormat("fr-FR").format(Math.round(n)) + " F CFA";
const eur = (n) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n / EUR) + " €";
const amt = (n) => (n === 0 ? "Inclus" : xof(n));

// ---- Partie 1 : Prestations de développement (ressources humaines) ----
const dev = [
  ["Conception & design (UI/UX, identité visuelle, responsive, ambiances)", "Design", 7, 90000],
  ["Site vitrine & accueil (hero immersif, quiz « Conseil express », animations)", "Front-end", 6, 90000],
  ["Catalogue dynamique + assistant IA (recherche texte/photo, traduction auto)", "Dev + IA", 9, 110000],
  ["Multilingue — 10 langues (dont arabe RTL)", "Full-stack", 4, 90000],
  ["Back-office administrateur (CRUD, ajout rapide/IA/photo, upload, rôles)", "Full-stack", 8, 90000],
  ["Multi-magasins (fiches, carte, routage des demandes de devis)", "Full-stack", 4, 90000],
  ["Base de données, authentification & sécurité", "Full-stack", 5, 90000],
  ["Tests, recette & optimisation", "QA / Dev", 5, 80000],
];

// ---- Partie 2 : Logiciels & services (1re année) ----
const services = [
  ["Nom de domaine (.ci + .com)", "1 an", 25000],
  ["Hébergement applicatif (Vercel)", "Palier gratuit", 0],
  ["Base de données PostgreSQL (Supabase / Neon)", "Palier gratuit", 0],
  ["Stockage des images produits", "Palier gratuit", 0],
  ["API Google Gemini (recherche, photo, traduction)", "Quota gratuit", 0],
  ["E-mail professionnel (1 adresse)", "1 an", 25000],
  ["Certificat SSL (HTTPS)", "Inclus", 0],
];

// ---- Partie 3 : Déploiement & accompagnement ----
const deploy = [
  ["Mise en ligne & configuration (domaine, environnements)", "2 j × 90 000", 180000],
  ["Reprise & migration des données", "1 j × 90 000", 90000],
  ["Formation à la prise en main (back-office)", "1 j × 80 000", 80000],
  ["Garantie & corrections — 1 mois après mise en ligne", "Offert", 0],
];

const sum = (rows, f) => rows.reduce((s, r) => s + f(r), 0);
const totalDev = sum(dev, (r) => r[2] * r[3]);
const totalServices = sum(services, (r) => r[2]);
const totalDeploy = sum(deploy, (r) => r[2]);
const totalJours = sum(dev, (r) => r[2]);
const brut = totalDev + totalServices + totalDeploy;
const remise = brut - 4000000; // remise lancement → net rond
const net = brut - remise;
const remisePct = Math.round((remise / brut) * 100);

let logo = "";
try {
  const b = fs.readFileSync(path.join(root, "public", "brand", "logo-light.png"));
  logo = `data:image/png;base64,${b.toString("base64")}`;
} catch {}

const devRows = dev.map(([d, p, j, t]) => `
  <tr><td>${d}</td><td class="c">${p}</td><td class="c">${j}</td><td class="r">${xof(t)}</td><td class="r b">${xof(j * t)}</td></tr>`).join("");
const servRows = services.map(([d, u, m]) => `
  <tr><td>${d}</td><td class="c">${u}</td><td class="r b">${amt(m)}</td></tr>`).join("");
const depRows = deploy.map(([d, u, m]) => `
  <tr><td>${d}</td><td class="c">${u}</td><td class="r b">${amt(m)}</td></tr>`).join("");

const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<title>Devis estimatif — Solid-BTP</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@600;800&family=Manrope:wght@400;500;700&family=Space+Mono&display=swap" rel="stylesheet">
<style>
  @page { size: A4; margin: 14mm 13mm; }
  * { box-sizing: border-box; }
  body { font-family: 'Manrope', Arial, sans-serif; color: #2B2521; font-size: 10.5px; line-height: 1.45; margin: 0; }
  .mono { font-family: 'Space Mono', monospace; }
  h1, h2, h3 { font-family: 'Bricolage Grotesque', Arial, sans-serif; margin: 0; }
  .bar { height: 5px; border-radius: 3px; background: linear-gradient(90deg,#FF6A1A,#7C5CFF,#22D3EE); }
  header { display:flex; justify-content:space-between; align-items:flex-start; gap:18px; margin-top:14px; }
  .brand { display:flex; align-items:center; gap:12px; }
  .brand img { height: 46px; }
  .brand .wm { font-family:'Bricolage Grotesque'; font-weight:800; font-size:24px; letter-spacing:-.5px; }
  .brand .wm span { background:linear-gradient(90deg,#FF6A1A,#7C5CFF,#22D3EE); -webkit-background-clip:text; background-clip:text; color:transparent; }
  .doc { text-align:right; }
  .doc .title { font-size:22px; font-weight:800; }
  .doc .badge { display:inline-block; margin-top:4px; background:#FFF1E6; color:#C2470A; border:1px solid #FFD9BE; border-radius:999px; padding:2px 9px; font-size:8.5px; font-weight:700; letter-spacing:.06em; text-transform:uppercase; }
  .doc .meta { font-size:9.5px; color:#5C544C; margin-top:5px; }
  .meta .k { color:#8A8079; }
  .parties { display:flex; gap:14px; margin:16px 0 6px; }
  .party { flex:1; border:1px solid #EFE7DA; border-radius:10px; padding:9px 11px; }
  .party .lab { font-size:8px; letter-spacing:.16em; text-transform:uppercase; color:#8A8079; }
  .party .v { font-weight:700; margin-top:2px; }
  .intro { color:#5C544C; font-size:9.5px; margin:6px 0 2px; }

  section { margin-top:14px; page-break-inside:auto; }
  .sh { display:flex; align-items:center; gap:9px; margin-bottom:6px; page-break-after:avoid; }
  .sh .n { width:22px;height:22px;border-radius:6px;color:#fff;font-weight:800;display:flex;align-items:center;justify-content:center;font-family:'Bricolage Grotesque';font-size:12px; }
  .sh h2 { font-size:13.5px; }
  .sh .sub { margin-left:auto; font-size:8.5px; color:#8A8079; }
  .p1 .n{background:#FF6A1A} .p2 .n{background:#7C5CFF} .p3 .n{background:#22D3EE}
  .p1 h2{color:#C2470A} .p2 h2{color:#5B3DF5} .p3 h2{color:#0E7C93}

  table { width:100%; border-collapse:collapse; }
  th,td { text-align:left; padding:5.5px 7px; vertical-align:top; }
  thead th { font-size:8px; letter-spacing:.1em; text-transform:uppercase; color:#8A8079; border-bottom:1.5px solid #E7DCC9; }
  tbody tr { border-bottom:1px solid #F1E8DB; page-break-inside:avoid; }
  tbody tr:nth-child(even){ background:#FCF8F1; }
  td.c{ text-align:center; white-space:nowrap; } td.r{ text-align:right; white-space:nowrap; } td.b{ font-weight:700; }
  .subtotal td{ border-top:1.5px solid #E7DCC9; font-weight:700; background:#fff; }

  .totals { margin-top:16px; display:flex; justify-content:flex-end; page-break-inside:avoid; }
  .totals .box { width:64%; border:1px solid #EFE7DA; border-radius:10px; overflow:hidden; }
  .totals .row { display:flex; justify-content:space-between; padding:7px 12px; font-size:10.5px; }
  .totals .row + .row { border-top:1px solid #F1E8DB; }
  .totals .remise { color:#0E7C93; }
  .totals .net { background:linear-gradient(90deg,#FF6A1A,#E8500B); color:#fff; font-size:13.5px; font-weight:800; }
  .totals .net .e { font-weight:500; opacity:.9; font-size:9.5px; }
  .totals .lab{ color:#5C544C; } .totals .val{ font-weight:700; }
  .opt { margin-top:8px; display:flex; justify-content:flex-end; }
  .opt .pill{ font-size:9px; color:#5C544C; border:1px dashed #C9BCA6; border-radius:8px; padding:5px 10px; }
  .opt .pill b{ color:#2B2521; }

  .terms { margin-top:14px; border-top:1px solid #E7DCC9; padding-top:8px; font-size:8.5px; color:#5C544C; }
  .terms b{ color:#2B2521; }
  .terms .grid{ display:flex; gap:18px; }
  .terms .grid > div{ flex:1; }
  footer { margin-top:12px; text-align:center; font-size:8px; color:#8A8079; }
</style></head>
<body>
  <div class="bar"></div>
  <header>
    <div class="brand">
      ${logo ? `<img src="${logo}" alt="Solid-BTP">` : ""}
      <div>
        <div class="wm">Solid<span>-BTP</span></div>
        <div class="mono" style="font-size:8px;letter-spacing:.18em;color:#8A8079;text-transform:uppercase">Super Quincaillerie · Daloa</div>
      </div>
    </div>
    <div class="doc">
      <div class="title">DEVIS ESTIMATIF</div>
      <div class="badge">Offre lancement · jeune entreprise</div>
      <div class="meta mono">
        <div><span class="k">N° </span>SBTP-DEV-2026-001</div>
        <div><span class="k">Date </span>18/06/2026 · <span class="k">Validité </span>30 j</div>
      </div>
    </div>
  </header>

  <div class="parties">
    <div class="party"><div class="lab">Prestataire</div><div class="v">Atelier Néo — Studio Web &amp; IA</div><div class="mono" style="font-size:8.5px;color:#8A8079">Développement d'applications sur mesure</div></div>
    <div class="party"><div class="lab">Client</div><div class="v">Solid-BTP</div><div class="mono" style="font-size:8.5px;color:#8A8079">Quincaillerie de bâtiment — Daloa, Côte d'Ivoire</div></div>
    <div class="party"><div class="lab">Objet</div><div class="v">Plateforme web sur mesure</div><div class="mono" style="font-size:8.5px;color:#8A8079">Vitrine + catalogue IA + back-office multi-magasins</div></div>
  </div>
  <p class="intro">Offre adaptée au <b>lancement de l'entreprise</b> : tarif freelance local, estimation resserrée (<b>${totalJours} jours</b>) et <b>paliers gratuits</b> pour l'hébergement, la base de données et l'IA la 1re année. Délai indicatif : 4 à 8 semaines. Montants <b>nets</b> en F CFA (équivalent indicatif en euros, 1 € = 655,957 F CFA).</p>

  <section class="p1">
    <div class="sh"><div class="n">1</div><h2>Prestations de développement (ressources humaines)</h2><div class="sub mono">${totalJours} jours</div></div>
    <table>
      <thead><tr><th>Poste</th><th class="c">Profil</th><th class="c">Jours</th><th class="r">Tarif/j</th><th class="r">Montant</th></tr></thead>
      <tbody>${devRows}
        <tr class="subtotal"><td colspan="4">Sous-total — Développement</td><td class="r">${xof(totalDev)}</td></tr>
      </tbody>
    </table>
  </section>

  <section class="p2">
    <div class="sh"><div class="n">2</div><h2>Logiciels &amp; services</h2><div class="sub mono">1re année</div></div>
    <table>
      <thead><tr><th>Désignation</th><th class="c">Base</th><th class="r">Montant</th></tr></thead>
      <tbody>${servRows}
        <tr class="subtotal"><td colspan="2">Sous-total — Logiciels &amp; services</td><td class="r">${xof(totalServices)}</td></tr>
      </tbody>
    </table>
    <p class="mono" style="font-size:8px;color:#8A8079;margin:4px 2px 0">Paliers gratuits suffisants au démarrage ; bascule vers une offre payante uniquement à la montée en charge (≈ 150 000–300 000 F CFA/an le moment venu).</p>
  </section>

  <section class="p3">
    <div class="sh"><div class="n">3</div><h2>Déploiement &amp; accompagnement</h2><div class="sub mono">mise en ligne</div></div>
    <table>
      <thead><tr><th>Désignation</th><th class="c">Base</th><th class="r">Montant</th></tr></thead>
      <tbody>${depRows}
        <tr class="subtotal"><td colspan="2">Sous-total — Déploiement &amp; accompagnement</td><td class="r">${xof(totalDeploy)}</td></tr>
      </tbody>
    </table>
  </section>

  <div class="totals">
    <div class="box">
      <div class="row"><span class="lab">Total brut</span><span class="val">${xof(brut)}</span></div>
      <div class="row remise"><span>Remise lancement — jeune entreprise (−${remisePct} %)</span><span class="val">− ${xof(remise)}</span></div>
      <div class="row net"><span>NET À PAYER</span><span>${xof(net)} <span class="e">(≈ ${eur(net)})</span></span></div>
    </div>
  </div>
  <div class="opt"><div class="pill">Option — <b>Maintenance &amp; support</b> : 50 000 F CFA / mois, sans engagement (mises à jour, sauvegardes, assistance). <i>Hors total.</i></div></div>

  <div class="terms">
    <div class="grid">
      <div><b>Conditions</b><br>Devis estimatif, non contractuel. Validité 30 jours. Règlement : <b>40 % à la commande, 60 % à la livraison</b>. TVA non applicable — régime de l'entreprenant (montants nets).</div>
      <div><b>Base d'estimation</b><br>Tarif freelance local (Afrique francophone, 150–250 €/j). Une plateforme sur-mesure de cette complexité (multilingue + IA + back-office) démarre à ~1,5 M F CFA ; tarif ajusté au lancement de l'entreprise.</div>
    </div>
  </div>
  <footer class="mono">Solid-BTP · Daloa, Côte d'Ivoire — Devis estimatif établi le 18/06/2026</footer>
</body></html>`;

fs.writeFileSync(path.join(root, "Devis_Solid-BTP.html"), html, "utf-8");
console.log("HTML écrit. Totaux :");
console.log("  Dev (RH)            :", xof(totalDev), "(", totalJours, "j )");
console.log("  Logiciels & services:", xof(totalServices));
console.log("  Déploiement & accomp:", xof(totalDeploy));
console.log("  Total brut          :", xof(brut));
console.log("  Remise lancement    : -", xof(remise), `(${remisePct}%)`);
console.log("  NET À PAYER         :", xof(net), "≈", eur(net));
