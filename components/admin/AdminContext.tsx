"use client";

// Contexte partagé par toute la console d'administration ERP : admin connecté,
// magasins accessibles, magasin actif (persisté en localStorage) et un petit
// système de notifications (toast).

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { PublicAdmin, Store } from "@/lib/types";

interface AdminCtx {
  me: PublicAdmin;
  isSuper: boolean;
  stores: Store[];
  activeStoreId: string;
  setActiveStoreId: (id: string) => void;
  activeStore: Store | null;
  storeName: (id: string) => string;
  flash: (msg: string) => void;
}

const Ctx = createContext<AdminCtx | null>(null);

const STORE_KEY = "sbtp_admin_store";

export function AdminProvider({
  me,
  stores,
  children,
}: {
  me: PublicAdmin;
  stores: Store[];
  children: React.ReactNode;
}) {
  const isSuper = me.role === "super";
  // Le super démarre sur « Tous les magasins » (scope vide) ; un gérant sur son magasin.
  const [activeStoreId, setActiveStoreIdState] = useState<string>(isSuper ? "" : stores[0]?.id ?? "");
  const [toast, setToast] = useState("");

  // Restaure le dernier magasin choisi s'il fait toujours partie des accessibles.
  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem(STORE_KEY) : null;
    if (saved !== null && (saved === "" ? isSuper : stores.some((s) => s.id === saved))) {
      setActiveStoreIdState(saved);
    }
  }, [stores, isSuper]);

  const setActiveStoreId = useCallback((id: string) => {
    setActiveStoreIdState(id);
    if (typeof window !== "undefined") localStorage.setItem(STORE_KEY, id);
  }, []);

  const flash = useCallback((msg: string) => {
    setToast(msg);
    window.clearTimeout((flash as unknown as { _t?: number })._t);
    (flash as unknown as { _t?: number })._t = window.setTimeout(() => setToast(""), 2800);
  }, []);

  const activeStore = useMemo(
    () => stores.find((s) => s.id === activeStoreId) ?? null,
    [stores, activeStoreId],
  );

  const storeName = useCallback(
    (id: string) => stores.find((s) => s.id === id)?.name ?? "—",
    [stores],
  );

  const value: AdminCtx = {
    me,
    isSuper,
    stores,
    activeStoreId,
    setActiveStoreId,
    activeStore,
    storeName,
    flash,
  };

  return (
    <Ctx.Provider value={value}>
      {children}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 animate-pop items-center gap-2.5 rounded-full border border-line bg-snow px-5 py-3 font-display text-sm font-semibold text-ink shadow-lift">
          <span className="h-2 w-2 rounded-full bg-green" />
          {toast}
        </div>
      )}
    </Ctx.Provider>
  );
}

export function useAdmin(): AdminCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAdmin must be used within AdminProvider");
  return ctx;
}
