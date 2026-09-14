import { requireSession } from '@/lib/auth/session';
import { requirePermission } from '@/lib/auth/permissions';
import SettingsForm from '@/components/settings/SettingsForm';
import { redirect } from 'next/navigation';

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await requireSession();
  // Only OWNER (settings.manage) can view
  requirePermission(session, 'settings.manage');
  if (!session) {
    redirect('/login');
  }
  return (
    <section className="p-6 md:p-8 lg:p-12">
      <h1 className="mb-6 text-2xl font-bold text-ink">Pengaturan Toko</h1>
      <SettingsForm />
    </section>
  );
}
