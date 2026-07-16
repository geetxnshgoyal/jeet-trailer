import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { getEnvDiagnostics } from "@/lib/env";
import { SetupGuide } from "@/components/setup-guide";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Jeet Trailers — Inventory & Workshop",
    template: "%s · Jeet Trailers",
  },
  description:
    "Internal inventory and workshop management system for Jeet Trailers.",
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  try {
    const diag = getEnvDiagnostics();
    const hasEnvError = !diag.client.success || !diag.server.success;

    return (
      <html lang="en" className={`${inter.variable} h-full`}>
        <body className="min-h-full antialiased">
          {hasEnvError ? (
            <SetupGuide diagnostics={diag} />
          ) : (
            <Providers>{children}</Providers>
          )}
        </body>
      </html>
    );
  } catch (err) {
    return (
      <html lang="en" className="h-full">
        <body className="min-h-full p-8 font-mono text-red-500 bg-red-50">
          <h1 className="text-xl font-bold mb-4">Fatal Error in RootLayout:</h1>
          <pre className="whitespace-pre-wrap">{err instanceof Error ? err.stack : String(err)}</pre>
        </body>
      </html>
    );
  }
}
