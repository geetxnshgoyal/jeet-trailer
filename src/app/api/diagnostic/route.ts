import { NextRequest, NextResponse } from "next/server";
import { getEnvDiagnostics, clientEnv, serverEnv } from "@/lib/env";
import { adminAuth } from "@/lib/firebase/admin";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const envKeys = [
      "NEXT_PUBLIC_FIREBASE_API_KEY",
      "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
      "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
      "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
      "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
      "NEXT_PUBLIC_FIREBASE_APP_ID",
      "FIREBASE_ADMIN_PROJECT_ID",
      "FIREBASE_ADMIN_CLIENT_EMAIL",
      "FIREBASE_ADMIN_PRIVATE_KEY",
      "SESSION_COOKIE_NAME",
    ];

    const report: Record<string, { exists: boolean; length: number; valueStart?: string }> = {};

    for (const key of envKeys) {
      const val = process.env[key];
      report[key] = {
        exists: !!val,
        length: val ? val.length : 0,
        valueStart: val ? val.substring(0, 10) + "..." : undefined,
      };
    }

    let envDiagnosticsError: string | null = null;
    try {
      getEnvDiagnostics();
    } catch (e) {
      envDiagnosticsError = e instanceof Error ? e.message + "\n" + e.stack : String(e);
    }

    let clientEnvError: string | null = null;
    try {
      clientEnv();
    } catch (e) {
      clientEnvError = e instanceof Error ? e.message + "\n" + e.stack : String(e);
    }

    let serverEnvError: string | null = null;
    try {
      serverEnv();
    } catch (e) {
      serverEnvError = e instanceof Error ? e.message + "\n" + e.stack : String(e);
    }

    let initAdminError: string | null = null;
    try {
      adminAuth();
    } catch (e) {
      initAdminError = e instanceof Error ? e.message + "\n" + e.stack : String(e);
    }

    return NextResponse.json({
      status: "ok",
      report,
      vercelEnv: process.env.VERCEL_ENV || "unknown",
      diagnostics: {
        envDiagnosticsError,
        clientEnvError,
        serverEnvError,
        initAdminError,
      }
    });
  } catch (err) {
    return NextResponse.json({
      status: "error",
      error: err instanceof Error ? err.message : String(err),
    }, { status: 500 });
  }
}
