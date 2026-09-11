import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { AppError } from "./errors";
import type { ApiErrorBody, ApiSuccessBody } from "@/types/api";

/**
 * Every API route in this project responds with the same envelope shape,
 * so the frontend can handle success/error uniformly instead of each
 * endpoint inventing its own response format.
 */
export function ok<T>(data: T, init?: { status?: number }) {
  const body: ApiSuccessBody<T> = { success: true, data };
  return NextResponse.json(body, { status: init?.status ?? 200 });
}

export function created<T>(data: T) {
  return ok(data, { status: 201 });
}

/** Friendlier Indonesian labels for the columns most likely to hit a unique constraint. */
const FIELD_LABELS: Record<string, string> = {
  name: "Nama",
  email: "Email",
  sku: "SKU",
  symbol: "Simbol",
  key: "Key",
};

/**
 * Converts any thrown error into a safe, consistent API error response.
 *
 * - Known AppError subclasses -> their own status/code/message/details.
 * - ZodError (validation) -> 422 with field-level details.
 * - Prisma constraint errors (unique/foreign-key/not-found) -> mapped to
 *   the same shape, so services don't need to hand-roll "check it exists
 *   first" queries purely to produce a friendly error — the database's
 *   own constraints are the single source of truth for uniqueness.
 * - Anything else -> generic 500. The real error is logged server-side
 *   only; its message/stack is never leaked to the client.
 */
export function toErrorResponse(error: unknown) {
  if (error instanceof AppError) {
    const body: ApiErrorBody = {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
    };
    return NextResponse.json(body, { status: error.statusCode });
  }

  if (error instanceof ZodError) {
    const body: ApiErrorBody = {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Data yang dikirim tidak valid.",
        details: error.flatten(),
      },
    };
    return NextResponse.json(body, { status: 422 });
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      const target = (error.meta?.target as string[] | undefined) ?? [];
      const field = target[0] ?? "data";
      const label = FIELD_LABELS[field] ?? field;
      const body: ApiErrorBody = {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: `${label} sudah digunakan.`,
          details: { fieldErrors: { [field]: [`${label} sudah digunakan.`] } },
        },
      };
      return NextResponse.json(body, { status: 422 });
    }

    if (error.code === "P2003") {
      const body: ApiErrorBody = {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Data referensi tidak valid atau sudah dihapus.",
        },
      };
      return NextResponse.json(body, { status: 422 });
    }

    if (error.code === "P2025") {
      const body: ApiErrorBody = {
        success: false,
        error: { code: "NOT_FOUND", message: "Data tidak ditemukan." },
      };
      return NextResponse.json(body, { status: 404 });
    }
  }

  // Unexpected error: log full detail server-side, expose nothing to client.
  console.error("[unhandled_api_error]", error);
  const body: ApiErrorBody = {
    success: false,
    error: {
      code: "INTERNAL_ERROR",
      message: "Terjadi kesalahan pada server. Silakan coba lagi.",
    },
  };
  return NextResponse.json(body, { status: 500 });
}

/**
 * Wraps a route handler so any thrown error (AppError, ZodError, or
 * unexpected) is automatically converted into a safe response, instead of
 * every route needing its own try/catch boilerplate.
 */
export function apiHandler<Args extends unknown[]>(
  handler: (...args: Args) => Promise<NextResponse>
) {
  return async (...args: Args): Promise<NextResponse> => {
    try {
      return await handler(...args);
    } catch (error) {
      return toErrorResponse(error);
    }
  };
}
