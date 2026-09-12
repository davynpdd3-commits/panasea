import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic'; // Ensure route is always treated as dynamic during build
import { requireSession } from '@/lib/auth/session';
import { requirePermission } from '@/lib/auth/permissions';
import {
  getSalesSummary,
  getDailySales,
  getTopProducts,
  getPaymentBreakdown,
  getTransactionStatusCounts,
} from '@/lib/services/report-service';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const from = url.searchParams.get('from') ?? undefined;
  const to = url.searchParams.get('to') ?? undefined;
  const limit = Number(url.searchParams.get('limit') ?? 10);

  const session = await requireSession();
  requirePermission(session, 'reports.view');

  const [summary, daily, topProducts, paymentBreakdown, statusCounts] = await Promise.all([
    getSalesSummary({ from, to }),
    getDailySales({ from, to }),
    getTopProducts({ from, to, limit }),
    getPaymentBreakdown({ from, to }),
    getTransactionStatusCounts({ from, to }),
  ]);

  return NextResponse.json({
    summary,
    daily,
    topProducts,
    paymentBreakdown,
    statusCounts,
  });
}
