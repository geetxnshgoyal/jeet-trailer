import type { Role } from "./types";

/**
 * Who can see what.
 *
 * Four roles, each confined to its own part of the business:
 *   admin     everything
 *   store     inventory and issues
 *   staff     gate passes
 *   workshop  the production line and repairs
 *
 * Everything outside a role's areas is hidden in the nav, refused by the API
 * and redirected away at the page. All three matter: hiding a nav item is
 * presentation, not access control, and a page redirect still leaves the
 * underlying API reachable by anyone who knows the URL.
 */

/** A guardable area of the app. One per navigable feature. */
export type Area =
  | "dashboard"
  | "inventory"
  | "issues"
  | "gatePass"
  | "workshop"
  | "repairs"
  | "categories"
  | "workers"
  | "reports";

const ALL_AREAS: Area[] = [
  "dashboard",
  "inventory",
  "issues",
  "gatePass",
  "workshop",
  "repairs",
  "categories",
  "workers",
  "reports",
];

/** Areas each role may reach. Admin is the only role with the run of the app. */
export const ROLE_AREAS: Record<Role, readonly Area[]> = {
  admin: ALL_AREAS,
  store: ["inventory", "issues"],
  staff: ["gatePass"],
  workshop: ["workshop", "repairs"],
};

/**
 * Accounts created before the roles were split store "worker", which meant
 * inventory and issues. That is exactly today's `store`, so map it rather than
 * migrating the user documents and risking locking someone out.
 */
export function normalizeRole(role: string | undefined | null): Role {
  if (role === "worker") return "store";
  return (ROLE_AREAS as Record<string, unknown>)[role ?? ""]
    ? (role as Role)
    : "store";
}

export function canAccess(role: string | undefined | null, area: Area): boolean {
  return ROLE_AREAS[normalizeRole(role)].includes(area);
}

/**
 * Where a role lands after signing in. Only admins have a dashboard, so
 * everyone else goes straight to the one part of the app they can use.
 */
export function landingPath(role: string | undefined | null): string {
  switch (normalizeRole(role)) {
    case "admin":
      return "/dashboard";
    case "staff":
      return "/gate-pass";
    case "workshop":
      return "/workshop";
    default:
      return "/inventory";
  }
}
