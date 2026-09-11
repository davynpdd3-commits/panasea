"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/products", label: "Produk" },
  { href: "/products/categories", label: "Kategori" },
  { href: "/products/addons", label: "Add-on" },
];

export function ProductsSubNav() {
  const pathname = usePathname();

  return (
    <nav className="mb-6 flex gap-1 border-b border-border" aria-label="Navigasi produk">
      {TABS.map((tab) => {
        const isActive = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "px-3 py-2 text-sm transition-colors",
              isActive
                ? "border-b-2 border-coffee-600 font-medium text-ink"
                : "text-ink-muted hover:text-ink"
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
