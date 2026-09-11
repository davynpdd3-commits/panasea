import { ForbiddenError } from "@/lib/errors";
import type { PermissionKey } from "./permission-catalog";
import type { Session } from "./session";

/**
 * Authorization checks against the session's *actual* permission list
 * (loaded from the database by session.ts) — never a hardcoded
 * `if (role === "OWNER")`. Adding a new role or changing what a role can
 * do is a data change (seed/admin UI), not a code change here.
 */

export function hasPermission(session: Session, permission: PermissionKey): boolean {
  return session.user.permissions.includes(permission);
}

/** Throws ForbiddenError unless the session's permissions include `permission`. */
export function requirePermission(session: Session, permission: PermissionKey): void {
  if (!hasPermission(session, permission)) {
    throw new ForbiddenError();
  }
}

/**
 * Coarse role check for the rare case a whole area is role-gated rather
 * than permission-gated. Prefer requirePermission() where possible.
 */
export function requireRole(session: Session, ...roleNames: string[]): void {
  if (!roleNames.includes(session.user.role)) {
    throw new ForbiddenError();
  }
}
