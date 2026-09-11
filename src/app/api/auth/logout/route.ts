import { cookies } from "next/headers";
import { apiHandler, ok } from "@/lib/api-response";
import { SESSION_COOKIE_NAME } from "@/lib/auth/jwt";

export const POST = apiHandler(async () => {
  cookies().delete(SESSION_COOKIE_NAME);
  return ok({ loggedOut: true });
});
