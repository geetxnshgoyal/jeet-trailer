"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Package, ClipboardList, Users, Loader2 } from "lucide-react";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api/client";
import type { InventoryItem, IssueRecord, AppUser } from "@/lib/domain/types";

interface SearchResults {
  items: InventoryItem[];
  issues: IssueRecord[];
  workers: AppUser[];
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 300);
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Listen for ⌘K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Fetch search results
  useEffect(() => {
    if (debouncedQuery.trim().length < 2) {
      setResults(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    api
      .get<{ results: SearchResults }>(`/api/search?q=${encodeURIComponent(debouncedQuery)}`)
      .then((res) => {
        setResults(res.results);
      })
      .catch(() => {
        setResults(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [debouncedQuery]);

  const handleSelect = (href: string) => {
    setOpen(false);
    setQuery("");
    setResults(null);
    router.push(href);
  };

  const hasResults =
    results &&
    (results.items.length > 0 || results.issues.length > 0 || results.workers.length > 0);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group flex h-9 w-full items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 text-sm text-muted-foreground transition-colors hover:bg-muted/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:w-64"
        aria-label="Search system"
      >
        <Search className="h-4 w-4 flex-shrink-0 text-muted-foreground" aria-hidden />
        <span className="truncate">Search…</span>
        <kbd className="ml-auto hidden rounded border border-border bg-background px-1.5 font-mono text-[10px] text-muted-foreground md:inline">
          ⌘K
        </kbd>
      </button>

      <Dialog open={open} onOpenChange={(val) => { setOpen(val); if(!val) setQuery(""); }}>
        <DialogContent className="p-0 gap-0 overflow-hidden sm:max-w-[550px] top-[20%] translate-y-0">
          <DialogHeader className="p-4 border-b border-border">
            <DialogTitle className="sr-only">Search</DialogTitle>
            <div className="relative flex items-center">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search items, vehicle no., worker name..."
                className="pl-9 h-10 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent text-sm"
                autoFocus
              />
              {loading && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />}
            </div>
          </DialogHeader>

          <div className="max-h-[350px] overflow-y-auto p-2">
            {query.trim().length < 2 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                Type at least 2 characters to search...
              </div>
            ) : !loading && !hasResults ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                No matching results found.
              </div>
            ) : (
              results && (
                <div className="space-y-4">
                  {/* Inventory Items */}
                  {results.items.length > 0 && (
                    <div className="space-y-1">
                      <h2 className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <Package className="h-3 w-3" /> Inventory Items
                      </h2>
                      {results.items.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => handleSelect(`/inventory/${item.id}`)}
                          className="w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors hover:bg-accent flex flex-col"
                        >
                          <span className="font-semibold text-foreground">{item.name}</span>
                          <span className="text-xs text-muted-foreground font-mono mt-0.5">
                            {item.code} {item.brand ? ` · ${item.brand}` : ""} {item.serialNumber ? ` · Serial: ${item.serialNumber}` : ""}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Issues */}
                  {results.issues.length > 0 && (
                    <div className="space-y-1">
                      <h2 className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <ClipboardList className="h-3 w-3" /> Issue Logs
                      </h2>
                      {results.issues.map((issue) => (
                        <button
                          key={issue.id}
                          onClick={() => handleSelect(`/issues/${issue.id}`)}
                          className="w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors hover:bg-accent flex flex-col"
                        >
                          <span className="font-semibold text-foreground">
                            {issue.itemName} (Qty: {issue.quantity})
                          </span>
                          <span className="text-xs text-muted-foreground font-mono mt-0.5">
                            {issue.code} · Vehicle: {issue.vehicleNumber} · Worker: {issue.workerName}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Workers */}
                  {results.workers.length > 0 && (
                    <div className="space-y-1">
                      <h2 className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <Users className="h-3 w-3" /> Workers
                      </h2>
                      {results.workers.map((worker) => (
                        <button
                          key={worker.id}
                          onClick={() => handleSelect(`/workers/${worker.id}`)}
                          className="w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors hover:bg-accent flex flex-col"
                        >
                          <span className="font-semibold text-foreground">{worker.name}</span>
                          <span className="text-xs text-muted-foreground mt-0.5">
                            {worker.email} {worker.phone ? ` · ${worker.phone}` : ""}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
