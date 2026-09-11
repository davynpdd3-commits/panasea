/**
 * Single source of truth for permissions and default role grants.
 *
 * This is intentionally NOT where authorization decisions are made at
 * runtime — that always happens against the database (see
 * src/lib/auth/session.ts, which loads a user's actual permissions from
 * Role -> RolePermission -> Permission). This file only feeds
 * prisma/seed.ts, so the seeded data and the app's compile-time
 * permission keys can never drift apart.
 *
 * Adding a new permission later: add it here, re-run the seed, and grant
 * it to whichever roles need it — no changes to authorization code.
 */

export interface PermissionDefinition {
  key: string;
  description: string;
}

export const PERMISSIONS = [
  { key: "dashboard.view", description: "Melihat dashboard" },
  { key: "pos.access", description: "Mengakses kasir (POS)" },
  { key: "transactions.view", description: "Melihat transaksi" },
  { key: "transactions.create", description: "Membuat transaksi" },
  { key: "transactions.refund", description: "Melakukan refund transaksi" },
  { key: "products.view", description: "Melihat produk" },
  { key: "products.manage", description: "Mengelola produk" },
  { key: "inventory.view", description: "Melihat inventori" },
  { key: "inventory.manage", description: "Mengelola inventori" },
  { key: "recipes.view", description: "Melihat resep/HPP" },
  { key: "recipes.manage", description: "Mengelola resep/HPP" },
  { key: "purchasing.view", description: "Melihat pembelian" },
  { key: "purchasing.manage", description: "Mengelola pembelian" },
  { key: "customers.view", description: "Melihat pelanggan" },
  { key: "customers.manage", description: "Mengelola pelanggan" },
  { key: "reports.view", description: "Melihat laporan" },
  { key: "employees.view", description: "Melihat data karyawan" },
  { key: "employees.manage", description: "Mengelola karyawan" },
  { key: "settings.manage", description: "Mengelola pengaturan toko" },
  { key: "audit_logs.view", description: "Melihat audit log" },
  { key: "shift.open", description: "Membuka shift" },
  { key: "shift.close", description: "Menutup shift" },
  { key: "shift.view", description: "Melihat detail shift" },
  { key: "shift.history", description: "Melihat riwayat shift" },
  // Owner dashboard and reports permissions
  { key: "dashboard.owner", description: "Melihat statistik keuangan di dashboard" },
// Duplicate reports.view entry removed
] as const satisfies readonly PermissionDefinition[];

export type PermissionKey = (typeof PERMISSIONS)[number]["key"];

export const ROLE_DEFINITIONS = {
  OWNER: {
    name: "OWNER",
    description: "Akses penuh ke seluruh sistem.",
    // Owner gets every permission that exists, derived rather than
    // re-listed by hand, so a newly added permission never silently
    // excludes the owner.
    permissions: PERMISSIONS.map((p) => p.key) as PermissionKey[],
  },
  CASHIER: {
    name: "CASHIER",
    description: "Akses operasional harian untuk kasir.",
    permissions: [
      "dashboard.view",
      "pos.access",
      "transactions.view",
      "transactions.create",
      "products.view",
      "customers.view",
    ] as PermissionKey[],
  },
} as const;
