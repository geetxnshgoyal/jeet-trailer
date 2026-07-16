"use client";

import { useMemo, useState } from "react";
import { useInventory } from "@/features/inventory/hooks";
import { useIssues, useWorkersList } from "@/features/issues/hooks";
import { FileText, Download, Calendar, Users, Package, AlertTriangle, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DataTable } from "@/components/common/data-table";
import { EmptyState } from "@/components/common/empty-state";
import { exportToPDF } from "../lib/export-pdf";
import { exportToExcel } from "../lib/export-excel";
import { formatDate } from "@/lib/utils";
import type { ColumnDef } from "@tanstack/react-table";

const ALL = "all";

export function ReportsPage() {
  const [activeTab, setActiveTab] = useState<string>("daily");
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>(ALL);

  // Fetch data
  const { data: workers } = useWorkersList();
  const { data: items, isLoading: loadingItems } = useInventory({});
  const { data: issues, isLoading: loadingIssues } = useIssues({});

  const now = new Date();
  
  // 1. Daily Issues Data (past 24h)
  const dailyIssues = useMemo(() => {
    if (!issues) return [];
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    return issues.filter((iss) => new Date(iss.issuedAt) >= oneDayAgo);
  }, [issues]);

  // 2. Weekly Issues Data (past 7 days)
  const weeklyIssues = useMemo(() => {
    if (!issues) return [];
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return issues.filter((iss) => new Date(iss.issuedAt) >= sevenDaysAgo);
  }, [issues]);

  // 3. Monthly Issues Data (past 30 days)
  const monthlyIssues = useMemo(() => {
    if (!issues) return [];
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    return issues.filter((iss) => new Date(iss.issuedAt) >= thirtyDaysAgo);
  }, [issues]);

  // 4. Worker-wise Issues Data
  const workerIssues = useMemo(() => {
    if (!issues) return [];
    if (selectedWorkerId === ALL) return issues;
    return issues.filter((iss) => iss.workerId === selectedWorkerId);
  }, [issues, selectedWorkerId]);

  // 5. Low Stock Data
  const lowStockItems = useMemo(() => {
    if (!items) return [];
    return items.filter((it) => it.status === "low_stock" || it.status === "out_of_stock");
  }, [items]);

  const activeData = useMemo(() => {
    switch (activeTab) {
      case "daily": return dailyIssues;
      case "weekly": return weeklyIssues;
      case "monthly": return monthlyIssues;
      case "worker": return workerIssues;
      case "inventory": return items || [];
      case "low_stock": return lowStockItems;
      default: return [];
    }
  }, [activeTab, dailyIssues, weeklyIssues, monthlyIssues, workerIssues, items, lowStockItems]);

  const issueColumns = useMemo<ColumnDef<any>[]>(
    () => [
      { accessorKey: "code", header: "Code" },
      { accessorKey: "itemName", header: "Item" },
      { accessorKey: "itemCode", header: "Item Code" },
      { accessorKey: "workerName", header: "Worker" },
      { accessorKey: "vehicleNumber", header: "Vehicle" },
      { accessorKey: "quantity", header: "Qty" },
      { accessorKey: "status", header: "Status" },
      {
        accessorKey: "issuedAt",
        header: "Issued At",
        cell: ({ row }) => formatDate(row.original.issuedAt),
      },
    ],
    [],
  );

  const inventoryColumns = useMemo<ColumnDef<any>[]>(
    () => [
      { accessorKey: "code", header: "Code" },
      { accessorKey: "name", header: "Item" },
      { accessorKey: "categoryName", header: "Category" },
      { accessorKey: "brand", header: "Brand" },
      { accessorKey: "quantity", header: "Qty" },
      { accessorKey: "unit", header: "Unit" },
      { accessorKey: "status", header: "Status" },
    ],
    [],
  );

  const handleExport = async (format: "pdf" | "excel") => {
    const reportTitle = `${activeTab.replace("_", " ")} report`;
    const isInventory = activeTab === "inventory" || activeTab === "low_stock";
    
    const headers = isInventory
      ? ["Code", "Item", "Category", "Brand", "Qty", "Unit", "Status"]
      : ["Code", "Item", "Item Code", "Worker", "Vehicle", "Qty", "Status", "Issued At"];
      
    const fields = isInventory
      ? ["code", "name", "categoryName", "brand", "quantity", "unit", "status"]
      : ["code", "itemName", "itemCode", "workerName", "vehicleNumber", "quantity", "status", "issuedAt"];

    const formattedData = activeData.map((d: any) => ({
      ...d,
      issuedAt: d.issuedAt ? formatDate(d.issuedAt) : undefined,
    }));

    if (format === "pdf") {
      exportToPDF(reportTitle, headers, formattedData, fields);
    } else {
      await exportToExcel(reportTitle, headers, formattedData, fields);
    }
  };

  const loading = loadingItems || loadingIssues;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">System Reports</h1>
          <p className="text-sm text-muted-foreground">
            Generate and export inventory and installation records audit logs.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            variant="outline"
            disabled={loading || activeData.length === 0}
            onClick={() => handleExport("pdf")}
          >
            <Download className="mr-2 h-4 w-4" /> Export PDF
          </Button>
          <Button
            size="sm"
            disabled={loading || activeData.length === 0}
            onClick={() => handleExport("excel")}
          >
            <Download className="mr-2 h-4 w-4" /> Export Excel
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-3 md:flex md:w-max gap-1">
          <TabsTrigger value="daily" className="text-xs">
            <Calendar className="h-3.5 w-3.5 mr-1.5" /> Daily
          </TabsTrigger>
          <TabsTrigger value="weekly" className="text-xs">
            <Calendar className="h-3.5 w-3.5 mr-1.5" /> Weekly
          </TabsTrigger>
          <TabsTrigger value="monthly" className="text-xs">
            <Calendar className="h-3.5 w-3.5 mr-1.5" /> Monthly
          </TabsTrigger>
          <TabsTrigger value="worker" className="text-xs">
            <Users className="h-3.5 w-3.5 mr-1.5" /> Worker-wise
          </TabsTrigger>
          <TabsTrigger value="inventory" className="text-xs">
            <Package className="h-3.5 w-3.5 mr-1.5" /> Full Stock
          </TabsTrigger>
          <TabsTrigger value="low_stock" className="text-xs">
            <AlertTriangle className="h-3.5 w-3.5 mr-1.5" /> Low Stock
          </TabsTrigger>
        </TabsList>

        <Card className="border-border">
          <CardHeader>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="capitalize">{activeTab.replace("_", " ")} Report</CardTitle>
                <CardDescription>
                  Previewing {activeData.length} records matching the filter criteria.
                </CardDescription>
              </div>
              
              {activeTab === "worker" && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground shrink-0 font-medium">Worker:</span>
                  <Select value={selectedWorkerId} onValueChange={setSelectedWorkerId}>
                    <SelectTrigger className="w-48 h-9 text-xs">
                      <SelectValue placeholder="Select Worker" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL}>All Workers</SelectItem>
                      {workers?.map((w) => (
                        <SelectItem key={w.id} value={w.id}>
                          {w.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-16 text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                <p className="text-sm text-muted-foreground mt-2">Aggregating report data...</p>
              </div>
            ) : activeData.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="No report entries"
                description="No matching audit entries were found for this report scope."
              />
            ) : (
              <DataTable
                columns={activeTab === "inventory" || activeTab === "low_stock" ? inventoryColumns : issueColumns}
                data={activeData}
              />
            )}
          </CardContent>
        </Card>
      </Tabs>
    </div>
  );
}
