import { redirect } from 'next/navigation';
import { requireSession } from '@/lib/auth/session';
import { requirePermission } from '@/lib/auth/permissions';
import ReportsDashboard from '@/components/reports/ReportsDashboard';

export default async function ReportsPage() {
  const session = await requireSession();
  requirePermission(session, 'reports.view');

  // If session missing, requireSession will have redirected already via middleware,
  // but we keep a defensive redirect here.
  if (!session) {
    redirect('/login');
  }

  return (
    <section className="p-6 md:p-8 lg:p-12">
      <h1 className="mb-6 text-2xl font-bold text-ink">Laporan Penjualan</h1>
      <ReportsDashboard />
    </section>
  );
}
