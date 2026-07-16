"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Truck, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { navItemsForRole } from "./nav-config";
import type { Role } from "@/lib/domain/types";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

/**
 * Dark steel sidebar with role-filtered navigation. Rendered both in the
 * fixed desktop rail and inside the mobile drawer, so it takes its items via
 * props rather than reading role itself.
 */
export function SidebarNav({
  role,
  onNavigate,
}: Readonly<{
  role: Role;
  onNavigate?: () => void;
}>) {
  const pathname = usePathname();
  const items = navItemsForRole(role);

  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowInstallBtn(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    const timer = setTimeout(() => {
      // Detect if already installed/standalone
      const nav = navigator as Navigator & { standalone?: boolean };
      const isStandalone = window.matchMedia("(display-mode: standalone)").matches || !!nav.standalone;
      if (isStandalone) return;

      // Detect iOS
      const userAgent = window.navigator.userAgent;
      const win = window as Window & { MSStream?: unknown };
      const ios = /iPad|iPhone|iPod/.test(userAgent) && !win.MSStream;
      setIsIOS(ios);

      if (ios) {
        setShowInstallBtn(true);
      }
    }, 0);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleAndroidInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setDeferredPrompt(null);
      setShowInstallBtn(false);
    }
  };

  const handleIOSInstall = () => {
    toast.info("Install on iOS", {
      description: "Tap the Share button at the bottom of Safari, then select 'Add to Home Screen'.",
      duration: 12000,
    });
  };

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Truck className="size-5" />
        </span>
        <div className="leading-tight">
          <p className="text-sm font-semibold text-white">Jeet Trailers</p>
          <p className="text-[11px] text-sidebar-foreground/60">
            Workshop System
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-2">
        {items.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-sidebar-foreground/80 hover:bg-white/5 hover:text-white",
              )}
            >
              <Icon className="size-[18px] shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border px-4 py-4 space-y-3">
        {showInstallBtn && (
          <button
            onClick={isIOS ? handleIOSInstall : handleAndroidInstall}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/20"
            type="button"
          >
            <Download className="size-3.5" />
            Install App
          </button>
        )}
        <p className="text-[11px] text-sidebar-foreground/50 px-1">
          v1.0 · Internal use only
        </p>
      </div>
    </div>
  );
}
