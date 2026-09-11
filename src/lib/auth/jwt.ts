import { SignJWT, jwtVerify } from "jose";

/**
 * Session token handling.
 *
 * This file is intentionally Prisma-free and only touches `process.env`
 * directly (not the zod-validated `getEnv()` from src/lib/env.ts), so it
 * stays safe to import from Next.js Middleware, which runs on the Edge
 * runtime and cannot use Node-only APIs or the Prisma client. The
 * database-backed parts of session handling live in src/lib/auth/session.ts
 * instead, which only runs in the Node runtime (API routes, server
 * components).
 */

export const SESSION_COOKIE_NAME = "panasea_session";

const SESSION_DURATION = "8h";
export const SESSION_COOKIE_MAX_AGE_SECONDS = 8 * 60 * 60;

function getSecretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error(
      "AUTH_SECRET tidak dikonfigurasi. Set variabel ini di file .env."
    );
  }
  return new TextEncoder().encode(secret);
}

/** Signs a new session token for the given user id. */
export async function createSessionToken(userId: string): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(SESSION_DURATION)
    .sign(getSecretKey());
}

/**
 * Verifies a session token and returns the user id it encodes.
 * Returns null for any invalid, tampered, expired, or missing token —
 * callers should always treat null as "not logged in", never throw.
 */
export async function verifySessionToken(
  token: string | undefined | null
): Promise<string | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}
