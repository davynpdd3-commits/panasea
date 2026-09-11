"use client";

import { useState, type ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { cn } from "@/lib/utils";
import type { SessionUser } from "@/types";

interface AppShellProps {
  children: ReactNode;
  user: SessionUser;
}

export function AppShell({ children, user }: AppShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-cream">
      {/* Desktop sidebar */}
      <Sidebar className="hidden w-60 shrink-0 md:flex" permissions={user.permissions} />

      {/* Mobile sidebar drawer */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            aria-label="Tutup menu navigasi"
            className="absolute inset-0 bg-coffee-900/40"
            onClick={() => setMobileNavOpen(false)}
          />
          <Sidebar
            className={cn("absolute inset-y-0 left-0 w-64")}
            onNavigate={() => setMobileNavOpen(false)}
            permissions={user.permissions}
          />
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onMenuClick={() => setMobileNavOpen(true)} user={user} />
        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}
