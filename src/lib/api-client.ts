import type { ApiBody } from "@/types/api";

export class ApiClientError extends Error {
  code: string;
  fieldErrors?: Record<string, string[]>;

  constructor(message: string, code: string, details?: unknown) {
    super(message);
    this.code = code;
    const parsed = details as { fieldErrors?: Record<string, string[]> } | undefined;
    this.fieldErrors = parsed?.fieldErrors;
  }
}

/**
 * Calls a PANASEA API route and unwraps the { success, data } / { success,
 * error } envelope from src/lib/api-response.ts. Throws ApiClientError on
 * failure so callers can `catch` once instead of checking `body.success`
 * by hand at every call site.
 */
export async function apiRequest<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    });
  } catch {
    throw new ApiClientError("Tidak dapat terhubung ke server. Periksa koneksi internet Anda.", "NETWORK_ERROR");
  }

  const body = (await res.json()) as ApiBody<T>;
  if (!body.success) {
    throw new ApiClientError(body.error.message, body.error.code, body.error.details);
  }
  return body.data;
}
