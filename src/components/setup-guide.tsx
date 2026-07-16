"use client";

import { AlertTriangle, CheckCircle, Info } from "lucide-react";
import type { ZodIssue } from "zod";

interface Diagnostics {
  readonly client: {
    readonly success: boolean;
    readonly errors: readonly ZodIssue[];
  };
  readonly server: {
    readonly success: boolean;
    readonly errors: readonly ZodIssue[];
  };
}

export function SetupGuide({ diagnostics }: Readonly<{ diagnostics: Diagnostics }>) {
  const clientKeys = [
    { key: "NEXT_PUBLIC_FIREBASE_API_KEY", desc: "Firebase Web API Key" },
    { key: "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN", desc: "Firebase Auth Domain" },
    { key: "NEXT_PUBLIC_FIREBASE_PROJECT_ID", desc: "Firebase Project ID" },
    { key: "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET", desc: "Firebase Storage Bucket Name" },
    { key: "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID", desc: "Firebase Sender ID" },
    { key: "NEXT_PUBLIC_FIREBASE_APP_ID", desc: "Firebase Web App ID" },
  ];

  const serverKeys = [
    { key: "FIREBASE_ADMIN_PROJECT_ID", desc: "Firebase Admin Project ID" },
    { key: "FIREBASE_ADMIN_CLIENT_EMAIL", desc: "Firebase Admin Service Client Email" },
    { key: "FIREBASE_ADMIN_PRIVATE_KEY", desc: "Firebase Admin Private Certificate Key" },
  ];

  const clientErrMap = new Map(diagnostics.client.errors.map(e => [e.path[0], e.message]));
  const serverErrMap = new Map(diagnostics.server.errors.map(e => [e.path[0], e.message]));

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-6 md:p-12">
      <div className="max-w-3xl w-full bg-slate-950 rounded-2xl border border-slate-800 p-8 shadow-2xl space-y-8">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-500/10 rounded-xl text-amber-500">
              <AlertTriangle className="size-8" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-white">
                Jeet Trailers Configuration Required
              </h1>
              <p className="text-slate-400 text-sm mt-1">
                Your environment variables are missing or incorrectly configured.
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 bg-blue-500/5 rounded-xl border border-blue-500/10 text-slate-300 text-sm flex gap-3">
          <Info className="size-5 text-blue-400 shrink-0 mt-0.5" />
          <p>
            To deploy this demo successfully, you must register these credentials in your
            hosting dashboard (e.g. <strong>Vercel Project Settings &gt; Environment Variables</strong>)
            and then <strong>trigger a new deployment (rebuild)</strong>.
          </p>
        </div>

        <div className="space-y-6">
          {/* Client Keys */}
          <div className="space-y-3">
            <h2 className="text-lg font-medium text-white flex items-center justify-between">
              <span>Client Configuration (Firebase Web SDK)</span>
              {diagnostics.client.success ? (
                <span className="text-xs bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-full flex items-center gap-1 font-normal">
                  <CheckCircle className="size-3" /> Configured
                </span>
              ) : (
                <span className="text-xs bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded-full flex items-center gap-1 font-normal">
                  <AlertTriangle className="size-3" /> Action Required
                </span>
              )}
            </h2>
            <div className="grid gap-2">
              {clientKeys.map(({ key, desc }) => {
                const err = clientErrMap.get(key);
                const hasErr = !!err;
                return (
                  <div
                    key={key}
                    className={`flex flex-col md:flex-row md:items-center justify-between p-3 rounded-lg border transition ${
                      hasErr
                        ? "bg-amber-500/5 border-amber-500/20"
                        : "bg-slate-900/50 border-slate-800"
                    }`}
                  >
                    <div>
                      <span className="font-mono text-xs font-semibold text-slate-300 block">
                        {key}
                      </span>
                      <span className="text-xs text-slate-500">{desc}</span>
                    </div>
                    {hasErr ? (
                      <span className="text-xs font-medium text-amber-400 mt-1 md:mt-0">
                        {err}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400 mt-1 md:mt-0 font-medium flex items-center gap-1">
                        <CheckCircle className="size-3 text-emerald-500" /> Configured
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Server Keys */}
          <div className="space-y-3">
            <h2 className="text-lg font-medium text-white flex items-center justify-between">
              <span>Server Configuration (Firebase Admin SDK)</span>
              {diagnostics.server.success ? (
                <span className="text-xs bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-full flex items-center gap-1 font-normal">
                  <CheckCircle className="size-3" /> Configured
                </span>
              ) : (
                <span className="text-xs bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded-full flex items-center gap-1 font-normal">
                  <AlertTriangle className="size-3" /> Action Required
                </span>
              )}
            </h2>
            <div className="grid gap-2">
              {serverKeys.map(({ key, desc }) => {
                const err = serverErrMap.get(key);
                const hasErr = !!err;
                return (
                  <div
                    key={key}
                    className={`flex flex-col md:flex-row md:items-center justify-between p-3 rounded-lg border transition ${
                      hasErr
                        ? "bg-amber-500/5 border-amber-500/20"
                        : "bg-slate-900/50 border-slate-800"
                    }`}
                  >
                    <div>
                      <span className="font-mono text-xs font-semibold text-slate-300 block">
                        {key}
                      </span>
                      <span className="text-xs text-slate-500">{desc}</span>
                    </div>
                    {hasErr ? (
                      <span className="text-xs font-medium text-amber-400 mt-1 md:mt-0">
                        {err}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400 mt-1 md:mt-0 font-medium flex items-center gap-1">
                        <CheckCircle className="size-3 text-emerald-500" /> Configured
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="text-xs text-slate-500 text-center pt-2">
          © {new Date().getFullYear()} Jeet Trailers. System Configuration Diagnostics.
        </div>
      </div>
    </div>
  );
}
