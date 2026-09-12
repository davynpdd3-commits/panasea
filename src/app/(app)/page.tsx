import Link from "next/link";
import { SystemStatusPanel } from "@/components/dashboard/SystemStatusPanel";
import { EmptyState } from "@/components/states/EmptyState";
import { getCurrentSession } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { countLowStock } from "@/lib/services/inventory-service";
export const dynamic = 'force-dynamic';
const ROLE_LABELS: Record<string, string> = {
  OWNER: "Owner",
  CASHIER: "Cashier",
};

export default async function DashboardPage() {
  // The (app) layout already redirects unauthenticated visitors to
  // /login, so `session` is expected to exist here — this call is cheap
  // (React cache() dedupes it against the layout's own call).
  const session = await getCurrentSession();
  const user = session?.user;

  const canViewInventory = Boolean(session && hasPermission(session, "inventory.view"));
  const canViewProducts = Boolean(session && hasPermission(session, "products.view"));

  const [activeProductCount, lowStockCount] = await Promise.all([
    canViewProducts ? db.product.count({ where: { isActive: true } }) : Promise.resolve(null),
    canViewInventory ? countLowStock() : Promise.resolve(null),
  ]);

  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-8">
        <h1 className="font-display text-2xl text-ink">Dashboard</h1>
        <p className="mt-1 text-sm text-ink-muted">
          {user
            ? `Halo, ${user.name} (${ROLE_LABELS[user.role] ?? user.role}).`
            : "Fondasi proyek PANASEA."}{" "}
          Modul operasional lain (POS, laporan, dsb.) akan dibangun pada batch
          berikutnya di atas fondasi ini.
        </p>
      </header>

      <section className="border-b border-border pb-6">
        <h2 className="text-sm font-medium text-ink">Status Sistem</h2>
        <SystemStatusPanel />
      </section>

      <section className="pt-6">
        <h2 className="text-sm font-medium text-ink">Ringkasan Operasional</h2>
        {activeProductCount === null && lowStockCount === null ? (
          <div className="mt-3">
            <EmptyState
              title="Belum ada data untuk ditampilkan"
              description="Ringkasan operasional akan tampil di sini sesuai akses Anda."
            />
          </div>
        ) : (
          <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
            {activeProductCount !== null && (
              <div>
                <dt className="text-ink-subtle">Produk Aktif</dt>
                <dd className="mt-0.5 text-lg text-ink">{activeProductCount}</dd>
              </div>
            )}
            {lowStockCount !== null && (
              <div>
                <dt className="text-ink-subtle">Bahan Baku Stok Menipis</dt>
                <dd className="mt-0.5 text-lg text-ink">
                  {lowStockCount === 0 ? (
                    "Semua aman"
                  ) : (
                    <Link href="/inventory?status=low" className="text-warning hover:underline">
                      {lowStockCount} bahan
                    </Link>
                  )}
                </dd>
              </div>
            )}
          </dl>
        )}
      </section>
    </div>
  );
}
