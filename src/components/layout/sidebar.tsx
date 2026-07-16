"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Truck } from "lucide-react";
import { cn } from "@/lib/utils";
import { navItemsForRole } from "./nav-config";
import type { Role } from "@/lib/domain/types";

/**
 * Dark steel sidebar with role-filtered navigation. Rendered both in the
 * fixed desktop rail and inside the mobile drawer, so it takes its items via
 * props rather than reading role itself.
 */
export function SidebarNav({
  role,
  onNavigate,
}: {
  role: Role;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const items = navItemsForRole(role);

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

      <div className="border-t border-sidebar-border px-5 py-4">
        <p className="text-[11px] text-sidebar-foreground/50">
          v1.0 · Internal use only
        </p>
      </div>
    </div>
  );
}
