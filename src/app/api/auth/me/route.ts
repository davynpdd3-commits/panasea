export const dynamic = "force-dynamic";
import { apiHandler, ok } from "@/lib/api-response";
import { getCurrentSession } from "@/lib/auth/session";

export const GET = apiHandler(async () => {
  const session = await getCurrentSession();
  return ok({ user: session?.user ?? null });
});
