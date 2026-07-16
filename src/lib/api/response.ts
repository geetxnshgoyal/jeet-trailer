import "server-only";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AuthError } from "@/lib/auth/session";

/**
 * Uniform JSON envelope for API routes: `{ data }` on success,
 * `{ error: { code, message, details? } }` on failure. Keeps client parsing
 * predictable and centralizes status-code mapping.
 */

export function ok<T>(data: T, init?: number | ResponseInit) {
  const responseInit = typeof init === "number" ? { status: init } : init;
  return NextResponse.json({ data }, responseInit);
}

export function fail(
  code: string,
  message: string,
  status: number,
  details?: unknown,
) {
  return NextResponse.json({ error: { code, message, details } }, { status });
}

/**
 * Wrap a route handler so thrown errors become consistent JSON responses.
 * Maps AuthError, ZodError, and the app's DomainError to appropriate statuses;
 * everything else is a 500 with the message hidden in production.
 */
export function handler<Args extends unknown[]>(
  fn: (...args: Args) => Promise<Response>,
) {
  return async (...args: Args): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (err) {
      if (err instanceof AuthError) {
        return fail(
          err.code,
          err.message,
          err.code === "UNAUTHENTICATED" ? 401 : 403,
        );
      }
      if (err instanceof ZodError) {
        return fail("VALIDATION", "Invalid request", 422, err.flatten());
      }
      if (err instanceof DomainError) {
        return fail(err.code, err.message, err.status);
      }
      console.error("[api] unhandled error:", err);
      const message =
        process.env.NODE_ENV === "production"
          ? "Something went wrong"
          : err instanceof Error
            ? err.message
            : String(err);
      return fail("INTERNAL", message, 500);
    }
  };
}

/** Business-rule violation with an intended HTTP status (e.g. insufficient stock). */
export class DomainError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 400,
  ) {
    super(message);
    this.name = "DomainError";
  }
}
