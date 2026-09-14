import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { apiHandler, ok } from "@/lib/api-response";
import { AccountInactiveError, InvalidCredentialsError, ValidationError } from "@/lib/errors";
import { loginSchema } from "@/lib/validation/auth";
import { verifyPassword, DUMMY_PASSWORD_HASH } from "@/lib/auth/password";
import {
  createSessionToken,
  SESSION_COOKIE_MAX_AGE_SECONDS,
  SESSION_COOKIE_NAME,
} from "@/lib/auth/jwt";

export const dynamic = "force-dynamic";

export const POST = apiHandler(async (request: NextRequest) => {
  const rawBody = await request.json().catch(() => {
    throw new ValidationError("Data yang dikirim tidak valid.");
  });
  const { email, password } = loginSchema.parse(rawBody);

  const user = await db.user.findUnique({
    where: { email: email.toLowerCase() },
    include: {
      role: {
        include: { permissions: { include: { permission: true } } },
      },
    },
  });

  // Always run a bcrypt compare, even if no user was found, against a
  // constant dummy hash — keeps timing consistent so response speed
  // doesn't reveal whether the email is registered.
  const passwordMatches = await verifyPassword(
    password,
    user?.passwordHash ?? DUMMY_PASSWORD_HASH
  );

  if (!user || !passwordMatches) {
    throw new InvalidCredentialsError();
  }

  if (!user.isActive) {
    throw new AccountInactiveError();
  }

  const token = await createSessionToken(user.id);

  cookies().set({
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_COOKIE_MAX_AGE_SECONDS,
  });

  return ok({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role.name,
      permissions: user.role.permissions.map((rp) => rp.permission.key),
    },
  });
});
