import { NextRequest } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/permissions";
import { apiHandler, created, ok } from "@/lib/api-response";
import {
  processCashPayment,
  initiateQrisPayment,
  listPayments,
} from "@/lib/services/payment-service";

const cashPaymentSchema = z.object({
  orderId: z.string().min(1),
  paymentMethod: z.literal("CASH"),
  amountTendered: z.number().int().positive("Jumlah uang harus lebih dari 0"),
});

const qrisPaymentSchema = z.object({
  orderId: z.string().min(1),
  paymentMethod: z.literal("QRIS"),
});

const createPaymentSchema = z.discriminatedUnion("paymentMethod", [
  cashPaymentSchema,
  qrisPaymentSchema,
]);

export const POST = apiHandler(async (request: NextRequest) => {
  const session = await requireSession();
  requirePermission(session, "transactions.create");

  const body = await request.json();
  const input = createPaymentSchema.parse(body);

  if (input.paymentMethod === "CASH") {
    const result = await processCashPayment({
      orderId: input.orderId,
      amountTendered: input.amountTendered,
      cashierId: session.user.id,
    });
    return created(result);
  }

  // QRIS: initiate PENDING payment
  const result = await initiateQrisPayment({
    orderId: input.orderId,
    cashierId: session.user.id,
  });
  return created(result);
});

export const GET = apiHandler(async (request: NextRequest) => {
  const session = await requireSession();
  requirePermission(session, "transactions.view");

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "20", 10)));
  const status = searchParams.get("status") as any;
  const method = searchParams.get("method") as any;

  const result = await listPayments({ page, pageSize, status, method });
  return ok(result);
});
