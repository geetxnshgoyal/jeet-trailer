import { z } from "zod";

/**
 * Runtime-validated environment access.
 *
 * Client-safe vars (NEXT_PUBLIC_*) are validated eagerly since they are inlined
 * at build time. Server-only vars are validated lazily on first use so that the
 * client bundle never trips over their absence.
 */

const clientSchema = z.object({
  NEXT_PUBLIC_FIREBASE_API_KEY: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_APP_ID: z.string().min(1),
  NEXT_PUBLIC_USE_FIREBASE_EMULATOR: z
    .enum(["true", "false"])
    .default("false"),
});

// NEXT_PUBLIC_* must be referenced statically for Next.js to inline them.
const rawClientEnv = {
  NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN:
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  NEXT_PUBLIC_USE_FIREBASE_EMULATOR:
    process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR,
};

let cachedClientEnv: z.infer<typeof clientSchema> | null = null;

export function clientEnv() {
  if (cachedClientEnv) return cachedClientEnv;
  const parsed = clientSchema.safeParse(rawClientEnv);
  if (!parsed.success) {
    // In the browser we surface a readable error; on the server this throws
    // during boot so misconfiguration is caught immediately.
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(
      `Missing/invalid Firebase client env vars:\n${issues}\n` +
        `Copy .env.example to .env.local and fill in the values.`,
    );
  }
  cachedClientEnv = parsed.data;
  return cachedClientEnv;
}

export const shouldUseEmulator = () =>
  clientEnv().NEXT_PUBLIC_USE_FIREBASE_EMULATOR === "true";

const serverSchema = z.object({
  FIREBASE_ADMIN_PROJECT_ID: z.string().min(1),
  FIREBASE_ADMIN_CLIENT_EMAIL: z.string().email(),
  FIREBASE_ADMIN_PRIVATE_KEY: z.string().min(1),
  SESSION_COOKIE_NAME: z.string().min(1).default("jt_session"),
  STORAGE_PROVIDER: z.enum(["firebase"]).default("firebase"),
});

let cachedServerEnv: z.infer<typeof serverSchema> | null = null;

export function serverEnv() {
  if (typeof window !== "undefined") {
    throw new Error("serverEnv() must not be called in the browser.");
  }
  if (cachedServerEnv) return cachedServerEnv;
  const parsed = serverSchema.safeParse({
    FIREBASE_ADMIN_PROJECT_ID: process.env.FIREBASE_ADMIN_PROJECT_ID,
    FIREBASE_ADMIN_CLIENT_EMAIL: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    FIREBASE_ADMIN_PRIVATE_KEY: process.env.FIREBASE_ADMIN_PRIVATE_KEY,
    SESSION_COOKIE_NAME: process.env.SESSION_COOKIE_NAME,
    STORAGE_PROVIDER: process.env.STORAGE_PROVIDER,
  });
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Missing/invalid server env vars:\n${issues}`);
  }
  cachedServerEnv = parsed.data;
  return cachedServerEnv;
}

export function getEnvDiagnostics() {
  const clientParsed = clientSchema.safeParse(rawClientEnv);
  const serverParsed = serverSchema.safeParse({
    FIREBASE_ADMIN_PROJECT_ID: process.env.FIREBASE_ADMIN_PROJECT_ID,
    FIREBASE_ADMIN_CLIENT_EMAIL: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    FIREBASE_ADMIN_PRIVATE_KEY: process.env.FIREBASE_ADMIN_PRIVATE_KEY,
    SESSION_COOKIE_NAME: process.env.SESSION_COOKIE_NAME,
    STORAGE_PROVIDER: process.env.STORAGE_PROVIDER,
  });

  return {
    client: {
      success: clientParsed.success,
      errors: clientParsed.success ? [] : clientParsed.error.issues,
    },
    server: {
      success: serverParsed.success,
      errors: serverParsed.success ? [] : serverParsed.error.issues,
    },
  };
}
