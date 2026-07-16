import {
  LayoutDashboard,
  Package,
  ClipboardList,
  Users,
  FileBarChart,
  Tags,
  type LucideIcon,
} from "lucide-react";
import type { Role } from "@/lib/domain/types";

/**
 * Sidebar navigation, filtered by role. Workers see a reduced set (no user
 * management, categories, or reports — matching their permission scope).
 */
export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Roles allowed to see this item. Omit for all authenticated users. */
  roles?: Role[];
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Inventory", href: "/inventory", icon: Package },
  { label: "Issues", href: "/issues", icon: ClipboardList },
  { label: "Categories", href: "/categories", icon: Tags, roles: ["admin"] },
  { label: "Workers", href: "/workers", icon: Users, roles: ["admin"] },
  { label: "Reports", href: "/reports", icon: FileBarChart, roles: ["admin"] },
];

export function navItemsForRole(role: Role): NavItem[] {
  return NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(role));
}
