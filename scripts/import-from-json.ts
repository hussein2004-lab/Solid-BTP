// One-time migration of the legacy file database (`data/db.json`) into Postgres.
// Preserves ids and timestamps so references (orders→store, sessions→admin) and
// existing login cookies keep working. Clears the tables first, so it is safe to
// re-run. Self-contained (no path aliases) to run under `tsx`.

import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

interface LegacyDb {
  admins?: Array<{ id: string; username: string; passwordHash: string; salt: string; role?: string; createdAt: string }>;
  articles?: Array<{ id: string; name: string; description?: string; category: string; price?: number; imageUrl?: string; createdAt: string }>;
  orders?: Array<{ id: string; name: string; email: string; phone: string; dateNeeded?: string; message?: string; storeId?: string; createdAt: string }>;
  stores?: Array<{ id: string; name: string; city?: string; address?: string; phone?: string; email?: string; hours?: string; lat?: string; lon?: string; imageUrl?: string; note?: string; createdAt: string }>;
  sessions?: Array<{ token: string; adminId: string; createdAt: string }>;
}

async function main() {
  const file = path.join(process.cwd(), "data", "db.json");
  if (!fs.existsSync(file)) {
    console.log("No data/db.json found — nothing to import (use `npm run db:seed` for a fresh DB).");
    return;
  }
  const db = JSON.parse(fs.readFileSync(file, "utf-8")) as LegacyDb;

  // Fresh import: clear existing rows (children first), then insert.
  await prisma.$transaction([
    prisma.session.deleteMany(),
    prisma.order.deleteMany(),
    prisma.article.deleteMany(),
    prisma.store.deleteMany(),
    prisma.admin.deleteMany(),
  ]);

  if (db.admins?.length) {
    await prisma.admin.createMany({
      data: db.admins.map((a) => ({
        id: a.id, username: a.username, passwordHash: a.passwordHash, salt: a.salt,
        role: a.role ?? "sub", createdAt: new Date(a.createdAt),
      })),
    });
  }
  if (db.stores?.length) {
    await prisma.store.createMany({
      data: db.stores.map((s) => ({
        id: s.id, name: s.name, city: s.city ?? "", address: s.address ?? "", phone: s.phone ?? "",
        email: s.email ?? "", hours: s.hours ?? "", lat: s.lat ?? "", lon: s.lon ?? "",
        imageUrl: s.imageUrl ?? "", note: s.note ?? "", createdAt: new Date(s.createdAt),
      })),
    });
  }
  if (db.articles?.length) {
    await prisma.article.createMany({
      data: db.articles.map((a) => ({
        id: a.id, name: a.name, description: a.description ?? "", category: a.category,
        price: a.price ?? 0, imageUrl: a.imageUrl ?? "", createdAt: new Date(a.createdAt),
      })),
    });
  }
  if (db.orders?.length) {
    await prisma.order.createMany({
      data: db.orders.map((o) => ({
        id: o.id, name: o.name, email: o.email, phone: o.phone, dateNeeded: o.dateNeeded ?? "",
        message: o.message ?? "", storeId: o.storeId ?? "", createdAt: new Date(o.createdAt),
      })),
    });
  }
  if (db.sessions?.length) {
    await prisma.session.createMany({
      data: db.sessions.map((s) => ({ token: s.token, adminId: s.adminId, createdAt: new Date(s.createdAt) })),
    });
  }

  console.log("✓ imported", {
    admins: db.admins?.length ?? 0,
    stores: db.stores?.length ?? 0,
    articles: db.articles?.length ?? 0,
    orders: db.orders?.length ?? 0,
    sessions: db.sessions?.length ?? 0,
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
