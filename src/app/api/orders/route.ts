import { NextRequest } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/permissions";
import { apiHandler, created } from "@/lib/api-response";
import { createOrder, OrderStatus } from "@/lib/services/order-service";

const orderItemSchema = z.object({
  productId: z.string(),
  variantId: z.string().nullable().optional(),
  quantity: z.number().int().positive(),
  notes: z.string().optional(),
  addons: z.array(
    z.object({
      addonId: z.string(),
    })
  ).default([]),
});

const createOrderSchema = z.object({
  status: z.enum(["DRAFT", "HELD", "OPEN", "CANCELLED", "COMPLETED"]),
  notes: z.string().optional(),
  items: z.array(orderItemSchema).min(1, "Minimal 1 produk"),
});

export const POST = apiHandler(async (request: NextRequest) => {
  const session = await requireSession();
  requirePermission(session, "transactions.create");

  const body = await request.json();
  const input = createOrderSchema.parse(body);

  const order = await createOrder({
    ...input,
    cashierId: session.user.id,
  });

  return created(order);
});
