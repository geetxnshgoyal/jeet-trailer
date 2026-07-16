import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { ok, handler } from "@/lib/api/response";
import { listItems } from "@/lib/data/inventory";
import { listIssues } from "@/lib/data/issues";
import { COLLECTIONS } from "@/lib/domain/constants";
import { adminDb } from "@/lib/firebase/admin";
import type { AppUser } from "@/lib/domain/types";

export const GET = handler(async (req: NextRequest) => {
  const user = await requireUser();
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q")?.trim().toLowerCase() || "";

  if (query.length < 2) {
    return ok({ results: { items: [], issues: [], workers: [] } });
  }

  // 1. Search Inventory Items
  const items = await listItems({ search: query });

  // 2. Search Issues (workers only see their own issues)
  const issues = await listIssues({
    workerId: user.role === "admin" ? undefined : user.uid,
    search: query,
  });

  // 3. Search Workers (Admin only)
  let workers: AppUser[] = [];
  if (user.role === "admin") {
    const workersSnap = await adminDb().collection(COLLECTIONS.users).get();
    const allWorkers = workersSnap.docs.map((d) => d.data() as AppUser);
    workers = allWorkers.filter(
      (w) =>
        w.name.toLowerCase().includes(query) ||
        w.email.toLowerCase().includes(query) ||
        (w.phone && w.phone.includes(query))
    );
  }

  return ok({
    results: {
      items: items.slice(0, 5),
      issues: issues.slice(0, 5),
      workers: workers.slice(0, 5),
    },
  });
});
