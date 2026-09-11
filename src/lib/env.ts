import { z } from "zod";

/**
 * Server-only environment schema.
 *
 * This module must only be imported from server-side code (API routes,
 * server components, server actions). Importing it from a "use client"
 * component will fail at build time, which is intentional: it stops
 * secrets from ever being bundled into client JavaScript.
 */
const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  APP_URL: z.string().url().default("http://localhost:3000"),
  AUTH_SECRET: z.string().min(1, "AUTH_SECRET is required"),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),

  // Payment provider config is optional at foundation stage — nothing
  // about a specific QRIS provider is required until it's integrated.
  QRIS_PROVIDER: z.string().optional(),
  QRIS_API_KEY: z.string().optional(),
  QRIS_WEBHOOK_SECRET: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

let cachedEnv: Env | null = null;

/**
 * Validates and returns process.env against the schema above.
 * Throws a clear error immediately if anything required is missing,
 * instead of letting a misconfiguration surface as a confusing bug later.
 */
export function getEnv(): Env {
  if (cachedEnv) return cachedEnv;

  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `- ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(
      `Invalid environment configuration. Check your .env file:\n${issues}`
    );
  }

  cachedEnv = parsed.data;
  return cachedEnv;
}
