import { NextRequest, NextResponse } from "next/server";

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

    let envModuleError: string | null = null;
    let envDiag: any = null;
    try {
      envDiag = await import("@/lib/env");
    } catch (e) {
      envModuleError = e instanceof Error ? e.message + "\n" + e.stack : String(e);
    }

    let adminModuleError: string | null = null;
    let adminDiag: any = null;
    try {
      adminDiag = await import("@/lib/firebase/admin");
    } catch (e) {
      adminModuleError = e instanceof Error ? e.message + "\n" + e.stack : String(e);
    }

    const runDiagnostics: Record<string, string> = {};

    if (envDiag) {
      try {
        envDiag.getEnvDiagnostics();
        runDiagnostics.getEnvDiagnostics = "ok";
      } catch (e) {
        runDiagnostics.getEnvDiagnostics = e instanceof Error ? e.message + "\n" + e.stack : String(e);
      }

      try {
        envDiag.clientEnv();
        runDiagnostics.clientEnv = "ok";
      } catch (e) {
        runDiagnostics.clientEnv = e instanceof Error ? e.message + "\n" + e.stack : String(e);
      }

      try {
        envDiag.serverEnv();
        runDiagnostics.serverEnv = "ok";
      } catch (e) {
        runDiagnostics.serverEnv = e instanceof Error ? e.message + "\n" + e.stack : String(e);
      }
    }

    if (adminDiag) {
      try {
        adminDiag.adminAuth();
        runDiagnostics.adminAuth = "ok";
      } catch (e) {
        runDiagnostics.adminAuth = e instanceof Error ? e.message + "\n" + e.stack : String(e);
      }
    }

    return NextResponse.json({
      status: "ok",
      report,
      vercelEnv: process.env.VERCEL_ENV || "unknown",
      errors: {
        envModuleError,
        adminModuleError,
      },
      runDiagnostics,
    });
  } catch (err) {
    return NextResponse.json({
      status: "error",
      error: err instanceof Error ? err.message : String(err),
    }, { status: 500 });
  }
}
