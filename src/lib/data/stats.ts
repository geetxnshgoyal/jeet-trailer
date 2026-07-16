import "server-only";
import { adminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/domain/constants";
import { listItems } from "./inventory";
import { listIssues } from "./issues";
import { nowIso } from "@/lib/utils";

export interface DashboardStats {
  totalItems: number;
  currentStock: number;
  lowStockItems: number;
  issuedToday: number;
  totalWorkers: number;
  pendingInstallations: number;
  categoryChart: Array<{ name: string; value: number }>;
  usageChart: Array<{ name: string; quantity: number }>;
  activityFeed: Array<{
    id: string;
    type: "issue" | "installation";
    title: string;
    description: string;
    timestamp: string;
  }>;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  // 1. Fetch all active items for stock summing and status calculations
  const items = await listItems({});
  const totalItems = items.length;
  let currentStock = 0;
  let lowStockItems = 0;

  const categoryCounts: Record<string, number> = {};

  for (const item of items) {
    currentStock += item.quantity;
    if (item.status === "low_stock" || item.status === "out_of_stock") {
      lowStockItems++;
    }
    // Group by category name
    categoryCounts[item.categoryName] = (categoryCounts[item.categoryName] || 0) + item.quantity;
  }

  const categoryChart = Object.entries(categoryCounts).map(([name, value]) => ({
    name,
    value,
  }));

  // 2. Count workers
  const workersSnap = await adminDb()
    .collection(COLLECTIONS.users)
    .where("role", "==", "worker")
    .where("active", "==", true)
    .count()
    .get();
  const totalWorkers = workersSnap.data().count;

  // 3. Count pending installations (status = "issued")
  const pendingSnap = await adminDb()
    .collection(COLLECTIONS.issues)
    .where("status", "==", "issued")
    .count()
    .get();
  const pendingInstallations = pendingSnap.data().count;

  // 4. Count issues today (using Midnight today Indian local time)
  // Current local time metadata says: 2026-07-16T17:55:28+05:30.
  // We can calculate the start of the day in local time.
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  
  const issuedTodaySnap = await adminDb()
    .collection(COLLECTIONS.issues)
    .where("issuedAt", ">=", startOfDay)
    .count()
    .get();
  const issuedToday = issuedTodaySnap.data().count;

  // 5. Get recent issues (last 10)
  const recentIssues = await listIssues({ limit: 10 });

  // 6. Calculate most issued items
  const itemUsage: Record<string, number> = {};
  for (const issue of recentIssues) {
    itemUsage[issue.itemName] = (itemUsage[issue.itemName] || 0) + issue.quantity;
  }
  const usageChart = Object.entries(itemUsage)
    .map(([name, quantity]) => ({ name, quantity }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);

  // 7. Activity Feed
  const activityFeed: DashboardStats["activityFeed"] = [];
  
  for (const issue of recentIssues) {
    activityFeed.push({
      id: `issue-${issue.id}`,
      type: "issue",
      title: "Item Issued",
      description: `${issue.workerName} issued ${issue.quantity} ${issue.itemName} (Code: ${issue.itemCode}) for Vehicle ${issue.vehicleNumber}`,
      timestamp: issue.issuedAt,
    });

    if (issue.status === "installed" && issue.installedAt) {
      activityFeed.push({
        id: `install-${issue.id}`,
        type: "installation",
        title: "Item Installed",
        description: `${issue.itemName} (Code: ${issue.itemCode}) installed on Vehicle ${issue.vehicleNumber}`,
        timestamp: issue.installedAt,
      });
    }
  }

  // Sort feed by timestamp desc, limit to 10
  activityFeed.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  const finalFeed = activityFeed.slice(0, 10);

  return {
    totalItems,
    currentStock,
    lowStockItems,
    issuedToday,
    totalWorkers,
    pendingInstallations,
    categoryChart,
    usageChart,
    activityFeed: finalFeed,
  };
}
