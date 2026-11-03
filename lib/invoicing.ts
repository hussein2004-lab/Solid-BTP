// Numérotation des factures + tenue automatique des comptes clients.
//
// Numéro : "<Préfixe>-<seq sur 4 chiffres>" (ex. "Facr-0007"), où `seq` est
// auto-incrémenté PAR MAGASIN ET PAR TYPE via la table InvoiceCounter, dans une
// transaction pour éviter toute collision entre deux saisies simultanées.
//
// Comptes clients : une facture à crédit (FACR) ou d'avoir (FAA) crée/maj
// automatiquement le compte client du magasin et ajuste son solde signé
// (> 0 = le client doit à Solid-BTP).

import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { newId } from "./db";
import { invoiceType, invoiceTypePrefix } from "./erp";

/** Client de transaction Prisma (ou le client global). */
type Db = Prisma.TransactionClient | typeof prisma;

/** Formate un numéro de facture à partir d'un type et d'une séquence. */
export function formatInvoiceNumber(type: string, seq: number): string {
  return `${invoiceTypePrefix(type)}-${String(seq).padStart(4, "0")}`;
}

/**
 * Réserve le prochain numéro pour (magasin, type) en incrémentant le compteur.
 * À appeler dans la même transaction que la création de la facture.
 */
export async function nextInvoiceSeq(db: Db, storeId: string, type: string): Promise<number> {
  const existing = await db.invoiceCounter.findUnique({
    where: { storeId_type: { storeId, type } },
  });
  if (!existing) {
    await db.invoiceCounter.create({ data: { id: newId(), storeId, type, lastSeq: 1 } });
    return 1;
  }
  const updated = await db.invoiceCounter.update({
    where: { storeId_type: { storeId, type } },
    data: { lastSeq: { increment: 1 } },
  });
  return updated.lastSeq;
}

/** Numéro suivant SANS le consommer (aperçu UI). */
export async function peekInvoiceNumber(storeId: string, type: string): Promise<string> {
  const counter = await prisma.invoiceCounter.findUnique({
    where: { storeId_type: { storeId, type } },
  });
  return formatInvoiceNumber(type, (counter?.lastSeq ?? 0) + 1);
}

export interface CustomerEffectInput {
  storeId: string;
  type: string;
  customerId?: string | null;
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  total: number; // montant TTC
}

/**
 * Crée/maj le compte client et ajuste son solde, pour les factures qui tiennent
 * un compte (FACR → débit +TTC ; FAA → avoir -TTC). Renvoie l'id du client lié,
 * ou null si le type ne suit pas de compte / nom manquant.
 * À appeler dans la transaction de création de la facture.
 */
export async function applyCustomerEffect(db: Db, input: CustomerEffectInput): Promise<string | null> {
  const type = invoiceType(input.type);
  if (!type || !type.tracksCustomer) return null;

  const name = input.customerName.trim();
  if (!name) return null;

  const delta = type.effect === "debit" ? input.total : type.effect === "credit" ? -input.total : 0;
  const phone = (input.customerPhone ?? "").trim();
  const address = (input.customerAddress ?? "").trim();

  // 1) client explicitement choisi
  if (input.customerId) {
    const found = await db.customer.findUnique({ where: { id: input.customerId } });
    if (found && found.storeId === input.storeId) {
      await db.customer.update({
        where: { id: found.id },
        data: { balance: { increment: delta }, ...(phone ? { phone } : {}), ...(address ? { address } : {}) },
      });
      return found.id;
    }
  }

  // 2) rapprochement par nom (insensible à la casse) + téléphone si fourni
  const match = await db.customer.findFirst({
    where: {
      storeId: input.storeId,
      name: { equals: name, mode: "insensitive" },
      ...(phone ? { phone } : {}),
    },
  });
  if (match) {
    await db.customer.update({
      where: { id: match.id },
      data: { balance: { increment: delta }, ...(phone ? { phone } : {}), ...(address ? { address } : {}) },
    });
    return match.id;
  }

  // 3) création automatique
  const created = await db.customer.create({
    data: { id: newId(), storeId: input.storeId, name, phone, address, balance: delta },
  });
  return created.id;
}
