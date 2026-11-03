"use client";

// Coquille de la console d'administration ERP : barre supérieure (logo, langue,
// ambiance, déconnexion), barre latérale role-aware avec sélecteur de magasin,
// et zone de contenu qui affiche le module actif. L'admin principal (super) voit
// les modules de supervision ; le gérant (sub) voit les modules opérationnels de
// son ou ses magasins.

import { useState } from "react";
import { LOGO_LIGHT, LOGO_DARK } from "@/lib/constants";
import { Link, useRouter } from "@/i18n/navigation";
import { AmbianceSwitcher, useAmbiance } from "@/components/Ambiance";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import type { PublicAdmin, Store } from "@/lib/types";
import { AdminProvider, useAdmin } from "./AdminContext";
import DashboardModule from "./modules/DashboardModule";
import CatalogueModule from "./modules/CatalogueModule";
import StoresModule from "./modules/StoresModule";
import TeamModule from "./modules/TeamModule";
import OnlineQuotesModule from "./modules/OnlineQuotesModule";
import InvoicesModule from "./modules/InvoicesModule";
import CustomersModule from "./modules/CustomersModule";
import SuppliersModule from "./modules/SuppliersModule";
import StockModule from "./modules/StockModule";
import EmployeesModule from "./modules/EmployeesModule";
import DayBookModule from "./modules/DayBookModule";
import AccountModule from "./modules/AccountModule";

interface ModuleDef {
  id: string;
  label: string;
  icon: string;
  group: string;
  render: () => React.ReactNode;
}

// ---- Modules du gérant (sous-admin) — opérationnels, bornés au magasin actif ----
const SUB_MODULES: ModuleDef[] = [
  { id: "dashboard", label: "Tableau de bord", icon: "📊", group: "Pilotage", render: () => <DashboardModule /> },
  { id: "invoices", label: "Factures", icon: "🧾", group: "Ventes", render: () => <InvoicesModule /> },
  { id: "online-quotes", label: "Devis en ligne", icon: "💬", group: "Ventes", render: () => <OnlineQuotesModule /> },
  { id: "customers", label: "Clients", icon: "👤", group: "Ventes", render: () => <CustomersModule /> },
  { id: "suppliers", label: "Fournisseurs", icon: "🚚", group: "Achats & stock", render: () => <SuppliersModule /> },
  { id: "stock", label: "Stock", icon: "📦", group: "Achats & stock", render: () => <StockModule /> },
  { id: "catalogue", label: "Catalogue", icon: "🏷️", group: "Achats & stock", render: () => <CatalogueModule /> },
  { id: "employees", label: "Employés", icon: "👷", group: "Personnel", render: () => <EmployeesModule /> },
  { id: "daybook", label: "Cahier de jour", icon: "📔", group: "Journal", render: () => <DayBookModule /> },
];

// ---- Modules de l'administrateur principal (super) — supervision multi-magasins ----
const SUPER_MODULES: ModuleDef[] = [
  { id: "overview", label: "Vue globale", icon: "📊", group: "Pilotage", render: () => <DashboardModule /> },
  { id: "stores", label: "Magasins", icon: "🏬", group: "Réseau", render: () => <StoresModule /> },
  { id: "team", label: "Sous-admins", icon: "👥", group: "Réseau", render: () => <TeamModule /> },
  { id: "invoices-all", label: "Factures", icon: "🧾", group: "Activité", render: () => <InvoicesModule /> },
  { id: "credits", label: "Crédits", icon: "💳", group: "Activité", render: () => <CustomersModule /> },
  { id: "suppliers-all", label: "Fournisseurs", icon: "🚚", group: "Activité", render: () => <SuppliersModule /> },
  { id: "expenses", label: "Dépenses", icon: "💸", group: "Activité", render: () => <DayBookModule /> },
  { id: "daybooks-all", label: "Cahiers de jour", icon: "📔", group: "Activité", render: () => <DayBookModule /> },
  { id: "catalogue", label: "Catalogue", icon: "🏷️", group: "Réseau", render: () => <CatalogueModule /> },
  { id: "settings", label: "Mon compte", icon: "⚙️", group: "Compte", render: () => <AccountModule /> },
];

function StoreSelector() {
  const { stores, activeStoreId, setActiveStoreId, isSuper } = useAdmin();
  // Un gérant mono-magasin n'a rien à choisir.
  if (!isSuper && stores.length <= 1) {
    return (
      <div className="rounded-xl border border-line bg-snow/70 px-3 py-2">
        <div className="font-mono text-[9px] uppercase tracking-widest text-muted">Magasin</div>
        <div className="truncate font-display text-sm font-bold text-ink">{stores[0]?.name ?? "—"}</div>
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-line bg-snow/70 px-3 py-2">
      <label className="font-mono text-[9px] uppercase tracking-widest text-muted">
        {isSuper ? "Périmètre" : "Magasin"}
      </label>
      <select
        value={activeStoreId}
        onChange={(e) => setActiveStoreId(e.target.value)}
        className="mt-0.5 w-full bg-transparent font-display text-sm font-bold text-ink outline-none"
      >
        {isSuper && <option value="">Tous les magasins</option>}
        {stores.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
    </div>
  );
}

function ShellInner() {
  const { me, isSuper, flash } = useAdmin();
  const router = useRouter();
  const { ambiance } = useAmbiance();
  const [mobileOpen, setMobileOpen] = useState(false);

  const modules = isSuper ? SUPER_MODULES : SUB_MODULES;
  const [active, setActive] = useState(modules[0].id);
  const current = modules.find((m) => m.id === active) ?? modules[0];

  // Regroupe les modules par section pour la barre latérale.
  const groups: { name: string; items: ModuleDef[] }[] = [];
  for (const m of modules) {
    const g = groups.find((x) => x.name === m.group);
    if (g) g.items.push(m);
    else groups.push({ name: m.group, items: [m] });
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    flash("Déconnexion…");
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <div className="veil-alt min-h-screen">
      {/* Barre supérieure */}
      <header className="no-print sticky top-0 z-40 border-b border-line bg-sun/80 backdrop-blur-xl">
        <div className="accent-line h-px w-full" aria-hidden />
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-3 px-4 py-3 lg:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen((v) => !v)}
              className="grid h-9 w-9 place-items-center rounded-lg border border-line text-ink lg:hidden"
              aria-label="Menu"
            >
              ☰
            </button>
            <Link href="/" className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={ambiance === "minuit" ? LOGO_DARK : LOGO_LIGHT} alt="Solid-BTP" className="h-8 w-auto" />
              <span className="hidden font-mono text-[10px] uppercase tracking-[0.25em] text-muted sm:inline">
                Gestion
              </span>
            </Link>
          </div>
          <div className="flex items-center gap-2.5">
            <LanguageSwitcher />
            <AmbianceSwitcher />
            <span className="hidden items-center gap-2 rounded-full border border-line bg-snow px-3 py-1.5 font-mono text-[11px] text-ink-soft sm:inline-flex">
              <span className="h-1.5 w-1.5 rounded-full bg-green" />
              {me.username} · {isSuper ? "Admin principal" : "Gérant"}
            </span>
            <button
              onClick={logout}
              className="rounded-full border-2 border-line px-3.5 py-1.5 font-mono text-xs text-ink transition-colors hover:border-amber hover:text-amber-deep"
            >
              Déconnexion
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1600px] gap-0">
        {/* Barre latérale */}
        <aside
          className={`${
            mobileOpen ? "block" : "hidden"
          } no-print fixed inset-x-0 top-[57px] z-30 max-h-[calc(100vh-57px)] overflow-y-auto border-b border-line bg-sun/95 px-4 py-4 backdrop-blur-xl lg:sticky lg:top-[57px] lg:block lg:max-h-[calc(100vh-57px)] lg:w-64 lg:shrink-0 lg:border-b-0 lg:border-r lg:bg-transparent lg:backdrop-blur-none`}
        >
          <div className="mb-4">
            <StoreSelector />
          </div>
          <nav className="space-y-5">
            {groups.map((g) => (
              <div key={g.name}>
                <div className="mb-1.5 px-2 font-mono text-[9px] uppercase tracking-[0.2em] text-muted">{g.name}</div>
                <div className="space-y-0.5">
                  {g.items.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => {
                        setActive(m.id);
                        setMobileOpen(false);
                      }}
                      className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left font-display text-sm font-semibold transition-all ${
                        active === m.id
                          ? "bg-gradient-to-r from-amber to-violet text-snow shadow-glow"
                          : "text-ink hover:bg-snow/70 hover:text-amber-deep"
                      }`}
                    >
                      <span className="text-base">{m.icon}</span>
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        {/* Contenu du module */}
        <main className="min-w-0 flex-1 px-4 py-6 lg:px-8 lg:py-8">{current.render()}</main>
      </div>
    </div>
  );
}

export default function AdminShell({ me, stores }: { me: PublicAdmin; stores: Store[] }) {
  return (
    <AdminProvider me={me} stores={stores}>
      <ShellInner />
    </AdminProvider>
  );
}
