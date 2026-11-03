// Contrôle d'accès de l'ERP : qui peut voir/agir sur quels magasins.
//
//  - super-admin  : accès à TOUS les magasins, gestion des comptes & magasins.
//  - sous-admin   : accès uniquement aux magasins listés dans AdminStore.
//
// Routes API : utiliser requireAdmin()/requireSuper() pour l'authentification,
// puis accessibleStoreIds()/assertStoreAccess() pour borner les données.

import { NextResponse } from "next/server";
import type { Admin } from "@prisma/client";
import { prisma } from "./prisma";
import { getCurrentAdmin } from "./auth";

/** Erreur HTTP simple portée jusqu'au handler de route (statut + message FR). */
export class AccessError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/**
 * Convertit une erreur en réponse JSON : statut+message si AccessError, sinon 500.
 * À utiliser dans le `catch` des routes ERP.
 */
export function errorResponse(e: unknown): NextResponse {
  if (e instanceof AccessError) {
    return NextResponse.json({ error: e.message }, { status: e.status });
  }
  console.error(e);
  return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
}

/** Admin connecté, sinon 401. */
export async function requireAdmin(): Promise<Admin> {
  const admin = await getCurrentAdmin();
  if (!admin) throw new AccessError(401, "Authentification requise.");
  return admin;
}

/** Admin principal connecté, sinon 401/403. */
export async function requireSuper(): Promise<Admin> {
  const admin = await requireAdmin();
  if (admin.role !== "super") {
    throw new AccessError(403, "Réservé à l'administrateur principal.");
  }
  return admin;
}

export function isSuper(admin: { role: string }): boolean {
  return admin.role === "super";
}

/**
 * Ids des magasins accessibles à l'admin :
 *  - super → tous les magasins ;
 *  - sub   → ceux de ses lignes AdminStore.
 */
export async function accessibleStoreIds(admin: Admin): Promise<string[]> {
  if (isSuper(admin)) {
    const stores = await prisma.store.findMany({ select: { id: true } });
    return stores.map((s) => s.id);
  }
  const links = await prisma.adminStore.findMany({
    where: { adminId: admin.id },
    select: { storeId: true },
  });
  return links.map((l) => l.storeId);
}

/** Vrai si l'admin peut opérer sur ce magasin. */
export async function canAccessStore(admin: Admin, storeId: string): Promise<boolean> {
  if (isSuper(admin)) return true;
  const link = await prisma.adminStore.findUnique({
    where: { adminId_storeId: { adminId: admin.id, storeId } },
  });
  return Boolean(link);
}

/** Lève 400 si storeId manquant, 403 si l'admin n'y a pas accès. */
export async function assertStoreAccess(admin: Admin, storeId: string): Promise<void> {
  if (!storeId) throw new AccessError(400, "Magasin non précisé.");
  if (!(await canAccessStore(admin, storeId))) {
    throw new AccessError(403, "Accès refusé à ce magasin.");
  }
}

/**
 * Résout le magasin demandé : si `storeId` est fourni, vérifie l'accès ; sinon
 * renvoie le seul magasin accessible (cas fréquent d'un gérant mono-magasin) ou
 * lève une erreur si le choix est ambigu / absent.
 */
export async function resolveStoreId(admin: Admin, storeId?: string | null): Promise<string> {
  if (storeId) {
    await assertStoreAccess(admin, storeId);
    return storeId;
  }
  const ids = await accessibleStoreIds(admin);
  if (ids.length === 1) return ids[0];
  if (ids.length === 0) throw new AccessError(403, "Aucun magasin accessible.");
  throw new AccessError(400, "Veuillez préciser le magasin.");
}
