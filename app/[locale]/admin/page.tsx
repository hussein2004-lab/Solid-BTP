import { getLocale } from "next-intl/server";
import { getCurrentAdmin, toPublic } from "@/lib/auth";
import { accessibleStoreIds } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { redirect } from "@/i18n/navigation";
import AdminShell from "@/components/admin/AdminShell";
import type { Store } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const admin = await getCurrentAdmin();
  if (!admin) {
    const locale = await getLocale();
    redirect({ href: "/admin/login", locale });
  }

  // Magasins accessibles : tous pour le super, ceux attribués pour un gérant.
  const ids = await accessibleStoreIds(admin!);
  const rows = await prisma.store.findMany({
    where: { id: { in: ids } },
    orderBy: { createdAt: "asc" },
  });
  const stores: Store[] = rows.map((s) => ({ ...s, createdAt: s.createdAt.toISOString() }));

  return <AdminShell me={toPublic(admin!)} stores={stores} />;
}
