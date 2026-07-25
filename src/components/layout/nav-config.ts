import {
  LayoutDashboard,
  Package,
  ClipboardList,
  Factory,
  Wrench,
  FileOutput,
  Users,
  FileBarChart,
  Tags,
  type LucideIcon,
} from "lucide-react";
import { canAccess, type Area } from "@/lib/domain/permissions";
import type { Role } from "@/lib/domain/types";

/**
 * Sidebar navigation. Each item names the area it belongs to, so what a role
 * can see is decided in one place (see lib/domain/permissions) rather than
 * being restated here and drifting from what the API actually allows.
 */
export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  area: Area;
}

export const NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    area: "dashboard",
  },
  { label: "Inventory", href: "/inventory", icon: Package, area: "inventory" },
  { label: "Issues", href: "/issues", icon: ClipboardList, area: "issues" },
  { label: "Gate Pass", href: "/gate-pass", icon: FileOutput, area: "gatePass" },
  { label: "Workshop", href: "/workshop", icon: Factory, area: "workshop" },
  {
    label: "Repairs",
    href: "/workshop/repairs",
    icon: Wrench,
    area: "repairs",
  },
  { label: "Categories", href: "/categories", icon: Tags, area: "categories" },
  { label: "Workers", href: "/workers", icon: Users, area: "workers" },
  { label: "Reports", href: "/reports", icon: FileBarChart, area: "reports" },
];

export function navItemsForRole(role: Role): NavItem[] {
  return NAV_ITEMS.filter((item) => canAccess(role, item.area));
}
