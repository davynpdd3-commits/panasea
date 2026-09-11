/**
 * Base class for all errors that are safe to translate directly into an
 * API response. Anything that is NOT an AppError is treated as an
 * unexpected/internal error and its details are never sent to the client
 * (see toErrorResponse in api-response.ts) — only logged server-side.
 */
export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;
  /** Extra machine-readable details safe to expose to the client (e.g. field errors). */
  readonly details?: unknown;

  constructor(
    message: string,
    options: { statusCode?: number; code?: string; details?: unknown } = {}
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = options.statusCode ?? 500;
    this.code = options.code ?? "INTERNAL_ERROR";
    this.details = options.details;
  }
}

export class ValidationError extends AppError {
  constructor(message = "Data yang dikirim tidak valid.", details?: unknown) {
    super(message, { statusCode: 422, code: "VALIDATION_ERROR", details });
  }
}

export class NotFoundError extends AppError {
  constructor(resource = "Data") {
    super(`${resource} tidak ditemukan.`, {
      statusCode: 404,
      code: "NOT_FOUND",
    });
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Anda harus login untuk mengakses ini.") {
    super(message, { statusCode: 401, code: "UNAUTHORIZED" });
  }
}

/**
 * Deliberately generic: used for BOTH "no such user" and "wrong password"
 * so the response never reveals whether a given email is registered.
 */
export class InvalidCredentialsError extends AppError {
  constructor(message = "Email atau password salah.") {
    super(message, { statusCode: 401, code: "INVALID_CREDENTIALS" });
  }
}

/**
 * Distinct from InvalidCredentialsError on purpose: once the password has
 * already been verified as correct, telling the (legitimate) user their
 * account was deactivated is expected UX, not an information leak.
 */
export class AccountInactiveError extends AppError {
  constructor(message = "Akun Anda tidak aktif. Hubungi owner/admin.") {
    super(message, { statusCode: 403, code: "ACCOUNT_INACTIVE" });
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Anda tidak memiliki izin untuk melakukan ini.") {
    super(message, { statusCode: 403, code: "FORBIDDEN" });
  }
}

export class ConflictError extends AppError {
  constructor(message = "Data bertentangan dengan kondisi saat ini.") {
    super(message, { statusCode: 409, code: "CONFLICT" });
  }
}
