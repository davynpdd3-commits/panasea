import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

export async function hashPassword(plainPassword: string): Promise<string> {
  return bcrypt.hash(plainPassword, SALT_ROUNDS);
}

export async function verifyPassword(
  plainPassword: string,
  passwordHash: string
): Promise<boolean> {
  return bcrypt.compare(plainPassword, passwordHash);
}

/**
 * A syntactically valid bcrypt hash that no real password matches
 * (the well-known bcrypt test vector for the string "password").
 *
 * Login always runs a bcrypt compare against *some* hash, even when no
 * user was found for the given email — comparing against this constant
 * in that case keeps response time close to the "user found" path, so
 * timing differences don't reveal whether an email is registered.
 */
export const DUMMY_PASSWORD_HASH =
  "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";
