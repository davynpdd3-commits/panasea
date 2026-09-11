"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SessionUser } from "@/types";

interface TopbarProps {
  onMenuClick: () => void;
  user: SessionUser;
}

const ROLE_LABELS: Record<string, string> = {
  OWNER: "Owner",
  CASHIER: "Cashier",
};

export function Topbar({ onMenuClick, user }: TopbarProps) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.push("/login");
      router.refresh();
    }
  }

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-surface px-4 md:px-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="rounded p-2 text-ink-muted hover:bg-coffee-50 md:hidden"
          aria-label="Buka menu navigasi"
        >
          <Menu className="h-5 w-5" strokeWidth={1.75} />
        </button>
        <span className="font-display text-base text-ink md:hidden">
          PANASEA
        </span>
      </div>

      <div className="flex items-center gap-3">
        <div className="text-right leading-tight">
          <p className="text-sm text-ink">{user.name}</p>
          <p className="text-xs text-ink-subtle">
            {ROLE_LABELS[user.role] ?? user.role}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          disabled={loggingOut}
        >
          <LogOut className="h-4 w-4" strokeWidth={1.75} />
          {loggingOut ? "Keluar..." : "Keluar"}
        </Button>
      </div>
    </header>
  );
}
