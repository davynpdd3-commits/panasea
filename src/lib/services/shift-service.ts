import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { requireSession } from '@/lib/auth/session';
import { requirePermission } from '@/lib/auth/permissions';
import { ForbiddenError, NotFoundError } from '@/lib/errors';

/**
 * Returns a summary of the active shift for a given cashier.
 * Includes opening cash, cash sales amount (sum of CASH payments), expected cash, and status.
 */
export async function getActiveShiftSummary(cashierId: string) {
  // Find open shift for this cashier
  const shift = await db.shift.findFirst({
    where: { cashierId, status: 'OPEN' },
    include: { cashier: true },
  });
  if (!shift) return null;

  // Sum of completed CASH payments belonging to orders created during this shift
  const cashPayments = await db.payment.aggregate({
    _sum: { amount: true },
    where: {
      paymentMethod: 'CASH',
      status: 'PAID',
      order: {
        // Orders are linked to the cashier via cashierId and createdAt within shift times
        cashierId: cashierId,
        createdAt: {
          gte: shift.openedAt,
          lte: shift.closedAt ?? new Date(),
        },
      },
    },
  });

  const cashSales = cashPayments._sum?.amount ?? 0;
  const expectedCash = shift.openingCash + cashSales;

  return {
    id: shift.id,
    cashierId: shift.cashierId,
    cashierName: shift.cashier?.name ?? '',
    status: shift.status,
    openedAt: shift.openedAt,
    closedAt: shift.closedAt,
    openingCash: shift.openingCash,
    cashSales,
    expectedCash,
    notes: shift.notes,
  } as const;
}

/** Helper used by dashboard to fetch owner‑only aggregates */
export async function getOwnerDashboardStats() {
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  // Completed (PAID) payments today
  const paymentsToday = await db.payment.aggregate({
    _sum: { amount: true },
    _count: { _all: true },
    where: {
      status: 'PAID',
      createdAt: { gte: startOfDay },
    },
  });

  const cashToday = await db.payment.aggregate({
    _sum: { amount: true },
    where: { paymentMethod: 'CASH', status: 'PAID', createdAt: { gte: startOfDay } },
  });

  const qrisToday = await db.payment.aggregate({
    _sum: { amount: true },
    where: { paymentMethod: 'QRIS', status: 'PAID', createdAt: { gte: startOfDay } },
  });

  const transactionCount = await db.payment.count({
    where: { status: 'PAID', createdAt: { gte: startOfDay } },
  });

  // Top‑selling products today (by quantity)
  const topProducts = await db.orderItem.groupBy({
    by: ['productId'],
    _sum: { quantity: true },
    where: { order: { status: 'COMPLETED', createdAt: { gte: startOfDay } } },
    orderBy: { _sum: { quantity: 'desc' } },
    take: 5,
    
  });

  return {
    revenueToday: paymentsToday._sum.amount ?? 0,
    transactionCount,
    cashRevenue: cashToday._sum.amount ?? 0,
    qrisRevenue: qrisToday._sum.amount ?? 0,
    topProducts: topProducts.map((p) => ({
      productId: p.productId,
      name: 'Unknown', // placeholder, will be replaced after fetching product names
      quantity: p._sum?.quantity ?? 0,
    })),
  };
}
