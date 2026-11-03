// Constantes métier de l'ERP Solid-BTP (gestion multi-magasins).
// Tout est en français : l'administration est mono-langue (cf. décision projet).
// Côté client comme serveur.

/** Effet d'une facture sur le solde du compte client (signe appliqué au montant TTC). */
export type CustomerEffect = "none" | "debit" | "credit";

export interface InvoiceType {
  id: string; // FAN | FAR | FAA | FACR | FAD
  prefix: string; // préfixe du numéro de facture
  label: string; // libellé affiché
  short: string; // libellé court (onglets, puces)
  /**
   * Impact sur le compte client :
   *  - "debit"  : le client doit davantage à Solid-BTP (crédit accordé → FACR)
   *  - "credit" : avoir en faveur du client (retour/avoir → FAA)
   *  - "none"   : facture normale, retour comptant, devis (pas de compte tenu)
   */
  effect: CustomerEffect;
  /** Crée/maj automatiquement un compte client (FACR + FAA). */
  tracksCustomer: boolean;
}

/** Les cinq types de factures, avec préfixe de numéro auto-incrémenté. */
export const INVOICE_TYPES: InvoiceType[] = [
  { id: "FAN", prefix: "Fan", label: "Facture normale", short: "Normale", effect: "none", tracksCustomer: false },
  { id: "FAR", prefix: "Far", label: "Facture de retour", short: "Retour", effect: "none", tracksCustomer: false },
  { id: "FAA", prefix: "Faa", label: "Facture d'avoir", short: "Avoir", effect: "credit", tracksCustomer: true },
  { id: "FACR", prefix: "Facr", label: "Facture à crédit", short: "Crédit", effect: "debit", tracksCustomer: true },
  { id: "FAD", prefix: "Fad", label: "Devis", short: "Devis", effect: "none", tracksCustomer: false },
];

export const INVOICE_TYPE_IDS = INVOICE_TYPES.map((t) => t.id);

export function invoiceType(id: string): InvoiceType | undefined {
  return INVOICE_TYPES.find((t) => t.id === id);
}

export function invoiceTypeLabel(id: string): string {
  return invoiceType(id)?.label ?? id;
}

export function invoiceTypePrefix(id: string): string {
  return invoiceType(id)?.prefix ?? id;
}

/** Catégories de dépenses du cahier de jour. */
export interface ExpenseCategory {
  id: string;
  label: string;
}

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  { id: "gazoil", label: "Gazoil" },
  { id: "journaliers", label: "Journaliers" },
  { id: "dechargement", label: "Déchargement" },
  { id: "pont_bascule", label: "Pont bascule" },
  { id: "autre", label: "Autre" },
];

export function expenseCategoryLabel(id: string): string {
  return EXPENSE_CATEGORIES.find((c) => c.id === id)?.label ?? id;
}

/** Nature d'une ligne du cahier de jour. `payment` est positif, le reste négatif. */
export type DayBookKind = "payment" | "expense" | "advance" | "deposit";

export interface DayBookKindMeta {
  id: DayBookKind;
  label: string;
  /** +1 : entrée d'argent ; -1 : sortie d'argent. */
  sign: 1 | -1;
}

export const DAYBOOK_KINDS: DayBookKindMeta[] = [
  { id: "payment", label: "Versement client", sign: 1 },
  { id: "expense", label: "Dépense", sign: -1 },
  { id: "advance", label: "Avance", sign: -1 },
  { id: "deposit", label: "Versement Solid-BTP", sign: -1 }, // ex. dépôt à la banque
];

export function dayBookKind(id: string): DayBookKindMeta | undefined {
  return DAYBOOK_KINDS.find((k) => k.id === id);
}

export function dayBookKindLabel(id: string): string {
  return dayBookKind(id)?.label ?? id;
}

/** Signe (+1 / -1) appliqué au montant d'une ligne du cahier de jour. */
export function dayBookSign(kind: string): number {
  return dayBookKind(kind)?.sign ?? 1;
}

/** Types de mouvement sur le compte d'un employé. */
export interface EmployeeTxType {
  id: string; // salary | advance | adjustment
  label: string;
  /** Effet sur le solde de l'employé (avance => +, on lui doit moins / il doit). */
  sign: 1 | -1;
}

export const EMPLOYEE_TX_TYPES: EmployeeTxType[] = [
  { id: "salary", label: "Salaire versé", sign: -1 },
  { id: "advance", label: "Avance", sign: 1 },
  { id: "adjustment", label: "Régularisation", sign: 1 },
];

export function employeeTxType(id: string): EmployeeTxType | undefined {
  return EMPLOYEE_TX_TYPES.find((t) => t.id === id);
}

export function employeeTxTypeLabel(id: string): string {
  return employeeTxType(id)?.label ?? id;
}

export const EMPLOYEE_STATUS = {
  active: "Actif",
  terminated: "Renvoyé",
} as const;

export function employeeStatusLabel(status: string): string {
  return EMPLOYEE_STATUS[status as keyof typeof EMPLOYEE_STATUS] ?? status;
}
