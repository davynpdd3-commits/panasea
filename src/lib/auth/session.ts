import { cache } from "react";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/jwt";
import { UnauthorizedError } from "@/lib/errors";
import type { SessionUser } from "@/types";

export interface Session {
  user: SessionUser;
}

/**
 * Resolves the current request's session, or null if not logged in.
 *
 * Wrapped in React's `cache()` so multiple calls within the same request
 * (e.g. from a layout AND the page it renders) share one DB query instead
 * of hitting Prisma twice for the same thing.
 *
 * Role and permissions are loaded from the database on every call, not
 * decoded from the JWT — the token only proves *who* the user is, not
 * what they're currently allowed to do. This also means a deactivated
 * account loses access immediately instead of waiting for the token to
 * expire.
 */
export const getCurrentSession = cache(async (): Promise<Session | null> => {
  const token = cookies().get(SESSION_COOKIE_NAME)?.value;
  const userId = await verifySessionToken(token);
  if (!userId) return null;

  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      role: {
        include: { permissions: { include: { permission: true } } },
      },
    },
  });

  if (!user || !user.isActive) return null;

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role.name,
      permissions: user.role.permissions.map((rp) => rp.permission.key),
    },
  };
});

/** Throws UnauthorizedError if there is no logged-in (and active) user. */
export async function requireSession(): Promise<Session> {
  const session = await getCurrentSession();
  if (!session) {
    throw new UnauthorizedError();
  }
  return session;
}
