import { NextRequest } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/permissions";
import { apiHandler, ok } from "@/lib/api-response";
import { NotFoundError } from "@/lib/errors";
import { updateOrderStatus, getOrderById } from "@/lib/services/order-service";

const updateOrderStatusSchema = z.object({
  status: z.enum(["DRAFT", "HELD", "OPEN", "CANCELLED", "COMPLETED"]),
});

export const GET = apiHandler(async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  const session = await requireSession();
  requirePermission(session, "transactions.view");

  const order = await getOrderById(params.id);
  if (!order) {
    throw new NotFoundError("Pesanan");
  }

  return ok(order);
});

export const PATCH = apiHandler(async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  const session = await requireSession();
  requirePermission(session, "transactions.create");

  const body = await request.json();
  const input = updateOrderStatusSchema.parse(body);

  const currentOrder = await getOrderById(params.id);
  if (!currentOrder) {
    throw new NotFoundError("Pesanan");
  }

  // Optional: Add logic here to deduct inventory if transitioning to COMPLETED
  // But for Batch 5, we keep it simple.

  const order = await updateOrderStatus(params.id, input.status);

  return ok(order);
});
