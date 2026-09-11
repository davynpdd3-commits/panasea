import { db } from "@/lib/db";
import { ValidationError, ConflictError, NotFoundError } from "@/lib/errors";
import { deductInventoryForOrderInTx } from "@/lib/services/inventory-service";

// ─── Types ──────────────────────────────────────

export type PaymentMethod = "CASH" | "QRIS";
export type PaymentStatus = "PENDING" | "PAID" | "FAILED" | "CANCELLED";

export interface CashPaymentInput {
  orderId: string;
  amountTendered: number;
  cashierId: string;
}

export interface QrisPaymentInput {
  orderId: string;
  cashierId: string;
}

export interface ConfirmQrisInput {
  paymentId: string;
  confirmedById: string;
}

// ─── Helpers ────────────────────────────────────

/** Fetch a payable order with full includes, or throw. */
async function getPayableOrder(orderId: string) {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: {
      payment: true,
      items: {
        include: {
          product: true,
          variant: true,
          addons: { include: { addon: true } },
        },
      },
    },
  });

  if (!order) throw new NotFoundError("Pesanan");

  // Only OPEN orders can be paid
  if (order.status === "COMPLETED") {
    throw new ConflictError("Pesanan sudah selesai dan sudah dibayar.");
  }
  if (order.status === "CANCELLED") {
    throw new ConflictError("Pesanan sudah dibatalkan.");
  }
  if (order.status !== "DRAFT" && order.status !== "HELD" && order.status !== "OPEN") {
    throw new ConflictError(`Pesanan dengan status "${order.status}" tidak dapat dibayar.`);
  }

  // Double payment protection
  if (order.payment && order.payment.status === "PAID") {
    throw new ConflictError("Pesanan sudah memiliki pembayaran yang berhasil.");
  }

  return order;
}

/** Recalculate order total from DB items to never trust frontend values. */
function recalculateOrderTotal(order: {
  items: { unitPrice: number; quantity: number; addons: { price: number }[] }[];
}) {
  let subtotal = 0;
  for (const item of order.items) {
    const addonsTotal = item.addons.reduce((sum, a) => sum + a.price, 0);
    subtotal += (item.unitPrice + addonsTotal) * item.quantity;
  }
  return subtotal;
}

// ─── Cash Payment (atomic) ──────────────────────

export async function processCashPayment(input: CashPaymentInput) {
  const order = await getPayableOrder(input.orderId);

  // Recalculate total server-side
  const serverTotal = recalculateOrderTotal(order);

  // Validate cash amount
  if (input.amountTendered < serverTotal) {
    throw new ValidationError(
      `Jumlah uang tidak mencukupi. Total: Rp ${serverTotal.toLocaleString("id-ID")}, diterima: Rp ${input.amountTendered.toLocaleString("id-ID")}.`
    );
  }

  const changeAmount = input.amountTendered - serverTotal;
  const now = new Date();

  // Atomic: create payment + complete order
  const result = await db.$transaction(async (tx) => {
    // Cancel any existing PENDING payment (e.g. abandoned QRIS)
    if (order.payment && order.payment.status === "PENDING") {
      await tx.payment.update({
        where: { id: order.payment.id },
        data: { status: "CANCELLED" },
      });
    }

    const payment = await tx.payment.create({
      data: {
        orderId: order.id,
        paymentMethod: "CASH",
        status: "PAID",
        amount: serverTotal,
        amountTendered: input.amountTendered,
        changeAmount,
        paidAt: now,
        createdById: input.cashierId,
      },
    });

    // Mark order completed
    const updatedOrder = await tx.order.update({
      where: { id: order.id },
      data: {
        status: "COMPLETED",
        subtotal: serverTotal,
        grandTotal: serverTotal,
      },
      include: {
        payment: true,
        items: {
          include: {
            product: true,
            variant: true,
            addons: { include: { addon: true } },
          },
        },
        cashier: { select: { id: true, name: true } },
      },
    });

    // Deduct inventory based on order items using recipe system
    await deductInventoryForOrderInTx(tx, order.id, order.items.map(item => ({
      productId: item.productId,
      variantId: item.variantId ?? null,
      quantity: item.quantity,
    })), input.cashierId);

    return { payment, order: updatedOrder };
  });

  return result;
}

// ─── QRIS Initiate (create PENDING payment) ─────

export async function initiateQrisPayment(input: QrisPaymentInput) {
  const order = await getPayableOrder(input.orderId);
  const serverTotal = recalculateOrderTotal(order);

  // Cancel any existing PENDING payment
  if (order.payment && order.payment.status === "PENDING") {
    await db.payment.update({
      where: { id: order.payment.id },
      data: { status: "CANCELLED" },
    });
  }

  // Re-check: if an existing PAID payment exists after the cancel check
  if (order.payment && order.payment.status === "PAID") {
    throw new ConflictError("Pesanan sudah memiliki pembayaran yang berhasil.");
  }

  const payment = await db.payment.create({
    data: {
      orderId: order.id,
      paymentMethod: "QRIS",
      status: "PENDING",
      amount: serverTotal,
      createdById: input.cashierId,
    },
  });

  // Move order to OPEN so it's clear a payment is in progress
  await db.order.update({
    where: { id: order.id },
    data: { status: "OPEN", subtotal: serverTotal, grandTotal: serverTotal },
  });

  return { payment, order: { ...order, status: "OPEN", grandTotal: serverTotal } };
}

// ─── QRIS Confirm (atomic) ──────────────────────

export async function confirmQrisPayment(input: ConfirmQrisInput) {
  const payment = await db.payment.findUnique({
    where: { id: input.paymentId },
    include: {
      order: {
        include: {
          items: {
            include: {
              product: true,
              variant: true,
              addons: { include: { addon: true } },
            },
          },
        },
      },
    },
  });

  if (!payment) throw new NotFoundError("Pembayaran");

  if (payment.status === "PAID") {
    throw new ConflictError("Pembayaran sudah dikonfirmasi.");
  }
  if (payment.status !== "PENDING") {
    throw new ConflictError(`Pembayaran dengan status "${payment.status}" tidak dapat dikonfirmasi.`);
  }
  if (payment.order.status === "COMPLETED") {
    throw new ConflictError("Pesanan sudah selesai.");
  }

  const now = new Date();

  const result = await db.$transaction(async (tx) => {
    const updatedPayment = await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: "PAID",
        paidAt: now,
        confirmedById: input.confirmedById,
      },
    });

    const updatedOrder = await tx.order.update({
      where: { id: payment.orderId },
      data: { status: "COMPLETED" },
      include: {
        payment: true,
        items: {
          include: {
            product: true,
            variant: true,
            addons: { include: { addon: true } },
          },
        },
        cashier: { select: { id: true, name: true } },
      },
    });

    // Deduct inventory using recipe system after payment confirmation
    await deductInventoryForOrderInTx(tx, payment.orderId, updatedOrder.items.map(item => ({
      productId: item.productId,
      variantId: item.variantId ?? null,
      quantity: item.quantity,
    })), input.confirmedById);

    return { payment: updatedPayment, order: updatedOrder };
  });

  return result;
}

// ─── Cancel QRIS (from PENDING) ─────────────────

export async function cancelQrisPayment(paymentId: string) {
  const payment = await db.payment.findUnique({
    where: { id: paymentId },
  });

  if (!payment) throw new NotFoundError("Pembayaran");

  if (payment.status !== "PENDING") {
    throw new ConflictError("Hanya pembayaran PENDING yang dapat dibatalkan.");
  }

  const result = await db.$transaction(async (tx) => {
    const updatedPayment = await tx.payment.update({
      where: { id: paymentId },
      data: { status: "CANCELLED" },
    });

    // Revert order to DRAFT so cashier can pick another method
    await tx.order.update({
      where: { id: payment.orderId },
      data: { status: "DRAFT" },
    });

    return updatedPayment;
  });

  return result;
}

// ─── Get payment by order ID ────────────────────

export async function getPaymentByOrderId(orderId: string) {
  return db.payment.findUnique({
    where: { orderId },
    include: {
      createdBy: { select: { id: true, name: true } },
      confirmedBy: { select: { id: true, name: true } },
      order: {
        select: {
          orderNumber: true,
          grandTotal: true,
          status: true,
        },
      },
    },
  });
}

// ─── Payment history ────────────────────────────

export async function listPayments(params: {
  page: number;
  pageSize: number;
  status?: PaymentStatus;
  method?: PaymentMethod;
}) {
  const where = {
    ...(params.status ? { status: params.status } : {}),
    ...(params.method ? { paymentMethod: params.method } : {}),
  };

  const [total, items] = await Promise.all([
    db.payment.count({ where }),
    db.payment.findMany({
      where,
      include: {
        order: {
          select: {
            orderNumber: true,
            grandTotal: true,
            status: true,
            cashier: { select: { name: true } },
          },
        },
        createdBy: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
    }),
  ]);

  return { items, total, page: params.page, pageSize: params.pageSize };
}
