import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { ok, handler } from "@/lib/api/response";
import { getDashboardStats } from "@/lib/data/stats";

/**
 * GET /api/dashboard — get dashboard statistics.
 * Accessible to any authenticated user.
 */
export const GET = handler(async () => {
  await requireUser();
  const stats = await getDashboardStats();
  return ok({ stats });
});
