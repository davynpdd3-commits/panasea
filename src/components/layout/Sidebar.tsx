"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingCart,
  Coffee,
  Boxes,
  ChefHat,
  Truck,
  Users,
  BarChart3,
  UserCog,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  implemented: boolean;
  /** If set, the item is only shown to users who hold this permission. */
  permission?: string;
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard, implemented: true },
  { label: "Kasir (POS)", href: "/pos", icon: ShoppingCart, implemented: true, permission: "pos.access" },
  { label: "Produk", href: "/products", icon: Coffee, implemented: true, permission: "products.view" },
  { label: "Inventori", href: "/inventory", icon: Boxes, implemented: true, permission: "inventory.view" },
  { label: "Resep & HPP", href: "/recipes", icon: ChefHat, implemented: true, permission: "recipes.view" },
  { label: "Pemasok", href: "/suppliers", icon: Truck, implemented: true, permission: "purchasing.view" },
  { label: "Pelanggan", href: "/customers", icon: Users, implemented: true, permission: "customers.view" },
  { label: "Laporan", href: "/reports", icon: BarChart3, implemented: true, permission: "reports.view" },
  { label: "Karyawan", href: "/employees", icon: UserCog, implemented: true, permission: "employees.view" },
  { label: "Pengaturan", href: "/settings", icon: Settings, implemented: true, permission: "settings.manage" },
];

interface SidebarProps {
  className?: string;
  onNavigate?: () => void;
  permissions?: string[];
}

export function Sidebar({ className, onNavigate, permissions = [] }: SidebarProps) {
  const pathname = usePathname();

  const visibleItems = navItems.filter(
    (item) => !item.permission || permissions.includes(item.permission)
  );

  return (
    <nav
      className={cn("flex h-full flex-col bg-coffee-700 text-coffee-50", className)}
      aria-label="Navigasi utama"
    >
      <div className="flex h-16 items-center gap-2 px-5">
        <span className="font-display text-lg tracking-tight text-surface">
          PANASEA
        </span>
      </div>

      <ul className="flex-1 space-y-0.5 overflow-y-auto px-3 py-2">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

          if (!item.implemented) {
            return (
              <li key={item.href}>
                <span
                  className="flex cursor-not-allowed items-center gap-3 rounded px-3 py-2 text-sm text-coffee-300"
                  aria-disabled="true"
                >
                  <Icon className="h-4 w-4" strokeWidth={1.75} />
                  {item.label}
                </span>
              </li>
            );
          }

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-3 rounded px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-coffee-600 text-surface"
                    : "text-coffee-100 hover:bg-coffee-600/60 hover:text-surface"
                )}
              >
                <Icon className="h-4 w-4" strokeWidth={1.75} />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>

      <p className="px-5 py-4 text-xs leading-relaxed text-coffee-300">
        Modul lainnya menyusul pada batch pengembangan berikutnya.
      </p>
    </nav>
  );
}
