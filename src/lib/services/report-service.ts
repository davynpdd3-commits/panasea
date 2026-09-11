import { db } from '@/lib/db';
// Date helpers use native JavaScript

/**
 * Helper to parse optional ISO date strings and default to a range.
 * Returns start and end Date objects inclusive.
 */
function parseDateRange(from?: string, to?: string) {
  const now = new Date();
  // Default to last 30 days
  const defaultFrom = new Date(now);
  defaultFrom.setDate(now.getDate() - 30);
  const start = from ? new Date(from) : defaultFrom;
  // Ensure start is at beginning of day (0:00:00)
  start.setHours(0, 0, 0, 0);
  const end = to ? new Date(to) : now;
  // End at end of day (23:59:59.999)
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

/** Sales summary based on PAID payments only */
export async function getSalesSummary(params: { from?: string; to?: string }) {
  const { start, end } = parseDateRange(params.from, params.to);

  // Revenue and transaction count from PAID payments
  const payments = await db.payment.findMany({
    where: {
      status: 'PAID',
      createdAt: { gte: start, lte: end },
    },
    select: { amount: true, orderId: true },
  });

  const revenue = payments.reduce((sum, p) => sum + p.amount, 0);
  const transactionCount = payments.length;

  // Total items sold (from order items of orders that have a PAID payment)
  const orderIds = payments.map((p) => p.orderId);
  const items = await db.orderItem.findMany({
    where: { orderId: { in: orderIds } },
    select: { quantity: true },
  });
  const totalItemsSold = items.reduce((sum, i) => sum + i.quantity, 0);

  // Average transaction value
  const avgTransaction = transactionCount ? Math.round(revenue / transactionCount) : 0;

  return { revenue, transactionCount, avgTransaction, totalItemsSold };
}

/** Daily sales trend (revenue per day) */
export async function getDailySales(params: { from?: string; to?: string }) {
  const { start, end } = parseDateRange(params.from, params.to);

  const payments = await db.payment.findMany({
    where: { status: 'PAID', createdAt: { gte: start, lte: end } },
    select: { amount: true, createdAt: true },
  });

  // Explicitly type the map to avoid TS index errors
  const dailyMap: { [key: string]: number } = {};
  payments.forEach((p) => {
    if (!p.createdAt) return; // safety check
    const iso = p.createdAt.toISOString();
    const day: string = iso.slice(0, 10); // YYYY-MM-DD
    dailyMap[day] = (dailyMap[day] ?? 0) + p.amount;
  });

  // Convert to sorted array
  const daily = Object.entries(dailyMap)
    .map(([date, amount]) => ({ date, amount }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return daily;
}

/** Top selling products based on quantity sold */
export async function getTopProducts(params: { from?: string; to?: string; limit?: number }) {
  const { start, end } = parseDateRange(params.from, params.to);

  // Get payments to filter orders
  const paidOrders = await db.payment.findMany({
    where: { status: 'PAID', createdAt: { gte: start, lte: end } },
    select: { orderId: true },
  });
  const orderIds = paidOrders.map((p) => p.orderId);

  const items = await db.orderItem.groupBy({
    by: ['productId'],
    where: { orderId: { in: orderIds } },
    _sum: { quantity: true, lineTotal: true },
    orderBy: { _sum: { quantity: 'desc' } },
    take: params.limit ?? 10,
  });

  // Populate product names
  const products = await db.product.findMany({
    where: { id: { in: items.map((i) => i.productId) } },
    select: { id: true, name: true },
  });

  const result = items.map((i) => {
    const prod = products.find((p) => p.id === i.productId);
    return {
      productId: i.productId,
      name: prod?.name ?? 'Unknown',
      quantitySold: i._sum?.quantity ?? 0,
      revenue: i._sum?.lineTotal ?? 0,
    };
  });

  return result;
}

/** Payment method breakdown for PAID payments */
export async function getPaymentBreakdown(params: { from?: string; to?: string }) {
  const { start, end } = parseDateRange(params.from, params.to);

  const breakdown = await db.payment.groupBy({
    by: ['paymentMethod'],
    where: { status: 'PAID', createdAt: { gte: start, lte: end } },
    _sum: { amount: true },
  });

  return breakdown.map((b) => ({ method: b.paymentMethod, amount: b._sum?.amount ?? 0 }));
}

/** Transaction status counts (independent of payment status) */
export async function getTransactionStatusCounts(params: { from?: string; to?: string }) {
  const { start, end } = parseDateRange(params.from, params.to);

  const counts = await db.order.groupBy({
    by: ['status'],
    where: { createdAt: { gte: start, lte: end } },
    _count: { status: true },
  });

  // Ensure all known statuses appear even if zero
  const allStatuses = ['DRAFT', 'HELD', 'OPEN', 'CANCELLED', 'COMPLETED'];
  const map: Record<string, number> = {};
  allStatuses.forEach((s) => (map[s] = 0));
  counts.forEach((c) => {
    map[c.status] = c._count?.status ?? 0;
  });

  return map;
}
