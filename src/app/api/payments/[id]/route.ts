import { NextRequest } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/permissions";
import { apiHandler, ok } from "@/lib/api-response";
import {
  confirmQrisPayment,
  cancelQrisPayment,
  getPaymentByOrderId,
} from "@/lib/services/payment-service";
import { NotFoundError } from "@/lib/errors";

const updatePaymentSchema = z.object({
  action: z.enum(["confirm", "cancel"]),
});

export const PATCH = apiHandler(async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  const session = await requireSession();
  requirePermission(session, "transactions.create");

  const body = await request.json();
  const input = updatePaymentSchema.parse(body);

  if (input.action === "confirm") {
    const result = await confirmQrisPayment({
      paymentId: params.id,
      confirmedById: session.user.id,
    });
    return ok(result);
  }

  // cancel
  const result = await cancelQrisPayment(params.id);
  return ok(result);
});
