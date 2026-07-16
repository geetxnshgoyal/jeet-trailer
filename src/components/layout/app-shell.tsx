"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { SidebarNav } from "./sidebar";
import { UserMenu } from "./user-menu";
import { Breadcrumbs } from "./breadcrumbs";
import { GlobalSearch } from "./global-search";
import type { Role } from "@/lib/domain/types";

/**
 * Authenticated app frame: fixed dark sidebar on desktop, slide-over drawer on
 * mobile, and a sticky topbar carrying breadcrumbs, global search, and the user
 * menu. The content area is a light surface that scrolls independently.
 */
export function AppShell({
  role,
  children,
}: {
  role: Role;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:w-64 lg:flex-shrink-0">
        <SidebarNav role={role} />
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50 animate-fade-in"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
          <div className="absolute inset-y-0 left-0 w-64">
            <SidebarNav role={role} onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-card/80 px-4 backdrop-blur lg:px-6">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="rounded-md p-2 text-muted-foreground hover:bg-accent lg:hidden"
            aria-label="Open navigation menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="hidden min-w-0 flex-1 sm:block">
            <Breadcrumbs />
          </div>

          <div className="flex flex-1 items-center justify-end gap-2 sm:flex-none">
            <GlobalSearch />
            <UserMenu />
          </div>
        </header>

        <main className="flex-1 px-4 py-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
