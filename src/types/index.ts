/**
 * Shared, cross-cutting types for PANASEA.
 *
 * Business entity types (Product, Transaction, Customer, ...) will be
 * added in a later batch once that part of the schema exists — deriving
 * types from `@prisma/client` at that point keeps types and schema from
 * drifting apart.
 */

export type LoadState = "idle" | "loading" | "success" | "error";

/**
 * The authenticated user's identity + resolved permissions for the
 * current request. `role` and `permissions` are loaded fresh from the
 * database on every request (see src/lib/auth/session.ts) — they are
 * NOT decoded from the JWT, so a role/permission change takes effect
 * immediately without requiring the user to log in again.
 */
export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: string;
  permissions: string[];
}
