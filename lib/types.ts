export type Role = "super" | "sub";

export interface Admin {
  id: string;
  username: string;
  passwordHash: string;
  salt: string;
  role: Role;
  createdAt: string;
}

/** Admin shape safe to send to the client (no secrets). */
export interface PublicAdmin {
  id: string;
  username: string;
  role: Role;
  createdAt: string;
}

export interface Article {
  id: string;
  name: string;
  description: string;
  category: string; // category id, see lib/constants
  price: number; // F CFA
  imageUrl: string; // placeholder url or empty
  createdAt: string;
}

/**
 * An existing catalogue article matched by the AI to a client's query/photo
 * (public "discovery" mode) — a real Article enriched with the AI's rationale.
 */
export type MatchedArticle = Article & { reason: string; score: number };

/** An article proposed by the AI (Gemini), ready to be confirmed & saved. */
export interface ProposedArticle {
  name: string;
  description: string;
  category: string; // always a valid category id after server-side sanitising
  price: number; // F CFA, integer ≥ 0
  reason: string; // short French rationale
  confidence: number; // 0 → 1
}

/**
 * A physical Solid-BTP store. Solid-BTP can run several shops, each with its own
 * address, contact details and storefront photo. Created only by a super-admin.
 */
export interface Store {
  id: string;
  name: string; // e.g. "Solid-BTP Daloa"
  city: string; // e.g. "Daloa"
  address: string;
  phone: string;
  email: string;
  hours: string;
  /** Map location — decimal degrees. Empty string when unknown (no map shown). */
  lat: string;
  lon: string;
  imageUrl: string; // storefront photo (public url) or empty
  note: string; // free extra info ("autre")
  createdAt: string;
}

export interface Order {
  id: string;
  name: string;
  email: string;
  phone: string;
  dateNeeded: string;
  message: string;
  storeId: string; // chosen recipient store ("" if none / legacy)
  createdAt: string;
}

export interface Session {
  token: string;
  adminId: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// ERP — formes côté client (les champs Date arrivent en chaînes ISO via JSON).
// ---------------------------------------------------------------------------

export interface InvoiceItem {
  id: string;
  invoiceId: string;
  articleId: string | null;
  label: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface Invoice {
  id: string;
  storeId: string;
  type: string; // FAN | FAR | FAA | FACR | FAD
  number: string;
  seq: number;
  date: string;
  customerId: string | null;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  subtotal: number;
  tax: number;
  total: number;
  note: string;
  createdById: string;
  createdAt: string;
  items?: InvoiceItem[];
}

export interface Customer {
  id: string;
  storeId: string;
  name: string;
  phone: string;
  address: string;
  email: string;
  balance: number; // signé : > 0 = doit à Solid-BTP
  createdAt: string;
  updatedAt: string;
}

export interface Supplier {
  id: string;
  storeId: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  balance: number; // F CFA dû au fournisseur
  note: string;
  createdAt: string;
}

export interface StockItem {
  id: string;
  storeId: string;
  articleId: string;
  quantity: number;
  purchasePrice: number;
  salePrice: number;
  createdAt: string;
  updatedAt: string;
}

export interface Employee {
  id: string;
  storeId: string;
  name: string;
  position: string;
  phone: string;
  baseSalary: number;
  balance: number;
  status: string; // active | terminated
  hiredAt: string;
  createdAt: string;
}

export interface EmployeeTx {
  id: string;
  employeeId: string;
  type: string; // salary | advance | adjustment
  amount: number;
  date: string;
  note: string;
  createdAt: string;
}

export interface DayBookEntry {
  id: string;
  storeId: string;
  date: string;
  kind: string; // payment | expense | advance | deposit
  category: string;
  label: string;
  amount: number;
  customerId: string | null;
  employeeId: string | null;
  createdById: string;
  createdAt: string;
}

export interface Database {
  admins: Admin[];
  articles: Article[];
  orders: Order[];
  stores: Store[];
  sessions: Session[];
}
