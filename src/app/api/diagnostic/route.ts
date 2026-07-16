import { NextRequest, NextResponse } from "next/server";

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

    return NextResponse.json({
      status: "ok",
      report,
      vercelEnv: process.env.VERCEL_ENV || "unknown",
    });
  } catch (err) {
    return NextResponse.json({
      status: "error",
      error: err instanceof Error ? err.message : String(err),
    }, { status: 500 });
  }
}
