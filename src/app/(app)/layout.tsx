import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { ToastProvider } from "@/components/ui/toast";
import { getCurrentSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getCurrentSession();

  // Middleware already redirects unauthenticated requests away from this
  // route group. This check is defense in depth (matches the "backend
  // must verify login" rule) — cheap, and protects against ever
  // rendering protected UI if middleware is bypassed or misconfigured.
  if (!session) {
    redirect("/login");
  }

  return (
    <ToastProvider>
      <AppShell user={session.user}>{children}</AppShell>
    </ToastProvider>
  );
}
