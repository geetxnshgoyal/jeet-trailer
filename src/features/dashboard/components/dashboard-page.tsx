"use client";

import { useDashboardStats } from "../hooks";
import {
  Package,
  Layers,
  AlertTriangle,
  ClipboardList,
  Users,
  Clock,
  TrendingUp,
  Settings,
  Plus,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";
import { formatDateTime } from "@/lib/utils";

const CHART_COLORS = [
  "hsl(28 92% 52%)", // Amber (accent)
  "hsl(222 47% 11%)", // Dark Steel (sidebar)
  "hsl(220 9% 46%)",  // Muted steel
  "hsl(142 71% 45%)", // Success Green
  "hsl(0 72% 51%)",   // Destructive Red
  "hsl(200 95% 40%)", // Blue
  "hsl(280 80% 50%)", // Purple
];

export function DashboardPage({ userName }: { userName: string }) {
  const { data: stats, isLoading, error } = useDashboardStats();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <CardHeader className="space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader><Skeleton className="h-5 w-48" /></CardHeader>
            <CardContent><Skeleton className="h-[300px] w-full" /></CardContent>
          </Card>
          <Card>
            <CardHeader><Skeleton className="h-5 w-48" /></CardHeader>
            <CardContent><Skeleton className="h-[300px] w-full" /></CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="py-16 text-center">
        <p className="text-destructive font-medium">Failed to load dashboard metrics.</p>
        <p className="text-muted-foreground text-sm mt-1">Please make sure the environment is configured correctly.</p>
      </div>
    );
  }

  const cardConfig = [
    {
      title: "Total Items",
      value: stats.totalItems,
      description: "Unique inventory records",
      icon: Package,
      colorClass: "text-blue-500",
    },
    {
      title: "Current Stock",
      value: stats.currentStock,
      description: "Total physical quantity",
      icon: Layers,
      colorClass: "text-indigo-500",
    },
    {
      title: "Low Stock Items",
      value: stats.lowStockItems,
      description: "Require replenishment",
      icon: AlertTriangle,
      colorClass: stats.lowStockItems > 0 ? "text-destructive" : "text-muted-foreground",
    },
    {
      title: "Issued Today",
      value: stats.issuedToday,
      description: "Items sent to workshop",
      icon: ClipboardList,
      colorClass: "text-amber-500",
    },
    {
      title: "Total Workers",
      value: stats.totalWorkers,
      description: "Active workshop staff",
      icon: Users,
      colorClass: "text-green-500",
    },
    {
      title: "Pending Install",
      value: stats.pendingInstallations,
      description: "Awaiting photo upload",
      icon: Clock,
      colorClass: stats.pendingInstallations > 0 ? "text-amber-600" : "text-muted-foreground",
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Welcome back, {userName.split(" ")[0]}
          </h1>
          <p className="text-sm text-muted-foreground">
            Here is a summary of the Jeet Trailers workshop and inventory status.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild size="sm">
            <Link href="/inventory">
              <Plus className="mr-2 h-4 w-4" /> Add Item
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/issues">
              <ClipboardList className="mr-2 h-4 w-4" /> Issue Item
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {cardConfig.map((card, index) => {
          const Icon = card.icon;
          return (
            <Card key={index} className="overflow-hidden border-border hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {card.title}
                </span>
                <Icon className={`h-4 w-4 ${card.colorClass}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tracking-tight">{card.value}</div>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {card.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Usage Chart */}
        <Card className="lg:col-span-2 border-border">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" /> Most Issued Items
            </CardTitle>
            <CardDescription>
              Quantity breakdown of top-issued parts recently
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            {stats.usageChart.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                No recent usage data available.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.usageChart} layout="vertical" margin={{ left: 20, right: 10, top: 10, bottom: 10 }}>
                  <XAxis type="number" stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis dataKey="name" type="category" stroke="#888888" fontSize={11} tickLine={false} axisLine={false} width={100} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                    labelStyle={{ fontWeight: "bold" }}
                  />
                  <Bar dataKey="quantity" fill="hsl(28 92% 52%)" radius={[0, 4, 4, 0]} maxBarSize={30} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Category breakdown */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Settings className="h-4 w-4 text-primary" /> Category Distribution
            </CardTitle>
            <CardDescription>
              Split of total units currently in stock
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] flex flex-col justify-between">
            {stats.categoryChart.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                No category data available.
              </div>
            ) : (
              <>
                <div className="h-[200px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats.categoryChart}
                        dataKey="value"
                        nameKey="name"
                        cx="55%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={75}
                        paddingAngle={3}
                      >
                        {stats.categoryChart.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {stats.categoryChart.slice(0, 6).map((c, i) => (
                    <div key={c.name} className="flex items-center gap-1.5 min-w-0">
                      <span
                        className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                      />
                      <span className="truncate text-muted-foreground">{c.name}</span>
                      <span className="ml-auto font-semibold">{c.value}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Activity Feed */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Activity Feed</CardTitle>
          <CardDescription>Recent actions from the workshop floor</CardDescription>
        </CardHeader>
        <CardContent>
          {stats.activityFeed.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No recent activity recorded.
            </div>
          ) : (
            <div className="space-y-4">
              {stats.activityFeed.map((act) => (
                <div key={act.id} className="flex items-start gap-3 text-sm pb-3 border-b border-border last:border-0 last:pb-0">
                  <div className={`mt-0.5 rounded-full p-1.5 shrink-0 ${
                    act.type === "issue" ? "bg-amber-100 text-amber-600" : "bg-green-100 text-green-600"
                  }`}>
                    {act.type === "issue" ? <ClipboardList className="h-4 w-4" /> : <Package className="h-4 w-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground">{act.title}</p>
                    <p className="text-muted-foreground text-xs mt-0.5 leading-relaxed">{act.description}</p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0 tabular-nums font-medium">
                    {formatDateTime(act.timestamp)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
