"use client";

/**
 * Thin fetch wrapper for the app's JSON API. Unwraps the `{ data }` /
 * `{ error }` envelope produced by the server route helpers, throwing an
 * ApiError with the server's code/message on failure so TanStack Query and
 * form handlers can surface it directly.
 */

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
    public details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface ApiEnvelope<T> {
  data?: T;
  error?: { code: string; message: string; details?: unknown };
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const res = await fetch(path, {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : {},
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  let envelope: ApiEnvelope<T> | null = null;
  try {
    envelope = (await res.json()) as ApiEnvelope<T>;
  } catch {
    // Non-JSON response (e.g. a crash before the handler ran).
  }

  if (!res.ok || !envelope || envelope.error) {
    const err = envelope?.error;
    throw new ApiError(
      err?.code ?? "REQUEST_FAILED",
      err?.message ?? `Request failed (${res.status})`,
      res.status,
      err?.details,
    );
  }

  return envelope.data as T;
}

export const api = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, body),
  patch: <T>(path: string, body?: unknown) => request<T>("PATCH", path, body),
  del: <T>(path: string, body?: unknown) => request<T>("DELETE", path, body),
};
