"use client";

import { useEffect, useState } from "react";
import { AppHeader } from "@/components/ui/AppHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis, LineChart, Line } from "recharts";
import { TrendingUp, TrendingDown, CheckCircle2, AlertOctagon, FileBarChart, BarChart2 } from "lucide-react";
import { getAnalytics } from "@/lib/api";
import { toast } from "sonner";

const chartConfig = {
  score:   { label: "UX Score",        color: "var(--color-primary)" },
  reviews: { label: "Reviews",          color: "var(--color-info)" },
  n:       { label: "Findings",         color: "var(--color-accent)" },
  accept:  { label: "Acceptance %",     color: "var(--color-primary)" },
  v:       { label: "WCAG 2.2 AA %",    color: "var(--color-primary)" },
};

function KpiSkeleton() {
  return <Skeleton className="h-24 rounded-xl" />;
}

function ChartSkeleton() {
  return <Skeleton className="h-64 w-full rounded-xl" />;
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}

export default function AnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    getAnalytics()
      .then((res) => {
        setData(res);
      })
      .catch((err) => {
        console.error(err);
        toast.error("Failed to load analytics data");
      })
      .finally(() => setIsLoading(false));
  }, []);

  const kpis = data ? [
    { l: "Avg UX score",       v: data.kpis.avgUxScore ? String(data.kpis.avgUxScore) : "—",  up: true,  icon: TrendingUp },
    { l: "Acceptance rate",    v: `${data.kpis.acceptanceRate || 0}%`,                              up: true,  icon: CheckCircle2 },
    { l: "Dismissal rate",     v: `${data.kpis.dismissalRate || 0}%`,                               up: false, icon: AlertOctagon },
    { l: "Total reviews",      v: String(data.kpis.totalReviews || data.kpis.completedReviews || 0),                              up: true,  icon: BarChart2 },
    { l: "Total findings",     v: String(data.kpis.totalFindings || 0),                             up: true,  icon: FileBarChart },
    { l: "P0 blockers",        v: String(data.kpis.p0Count || 0),                                   up: false, icon: AlertOctagon },
  ] : [];

  return (
    <>
      <AppHeader title="Analytics" subtitle="Value, trust, and governance metrics across products" />
      <div className="flex-1 space-y-5 p-4 md:p-6">

        {/* Filters */}
        <div className="flex flex-row flex-wrap gap-2">
          {["Product", "Domain", "Review type", "Owner"].map((f) => (
            <Select key={f}>
              <SelectTrigger className="h-10 w-40" aria-label={f}>
                <SelectValue placeholder={f} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All {f.toLowerCase()}</SelectItem>
              </SelectContent>
            </Select>
          ))}
        </div>

        {/* KPIs */}
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          {isLoading
            ? Array.from({ length: 6 }).map((_, i) => <KpiSkeleton key={i} />)
            : kpis.map((k) => (
              <Card key={k.l} className="shadow-card">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{k.l}</p>
                    <k.icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  </div>
                  <p className="mt-1 text-2xl font-semibold tabular-nums">{k.v}</p>
                  <p className="flex items-center gap-1 text-[11px] text-muted-foreground mt-1">
                    {k.up
                      ? <TrendingUp className="h-3 w-3 text-success" aria-hidden="true" />
                      : <TrendingDown className="h-3 w-3 text-destructive" aria-hidden="true" />}
                    Live from database
                  </p>
                </CardContent>
              </Card>
            ))
          }
        </div>

        <div className="grid gap-4 lg:grid-cols-2">

          {/* UX score trend */}
          <Card className="shadow-card">
            <CardHeader className="pb-2"><CardTitle className="text-base">UX score trend</CardTitle></CardHeader>
            <CardContent>
              {isLoading ? <ChartSkeleton /> : !data?.trend?.length ? (
                <EmptyChart message="No completed reviews with UX scores yet." />
              ) : (
                <ChartContainer config={chartConfig} className="h-64 w-full">
                  <ResponsiveContainer>
                    <AreaChart data={data.trend}>
                      <defs>
                        <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="var(--primary)" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid vertical={false} stroke="var(--border)" />
                      <XAxis dataKey="m" tickLine={false} axisLine={false} fontSize={11} />
                      <YAxis tickLine={false} axisLine={false} fontSize={11} domain={[0, 100]} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Area dataKey="score" stroke="var(--primary)" strokeWidth={2} fill="url(#g1)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

          {/* Findings by category */}
          <Card className="shadow-card">
            <CardHeader className="pb-2"><CardTitle className="text-base">Findings by area</CardTitle></CardHeader>
            <CardContent>
              {isLoading ? <ChartSkeleton /> : !data?.byCategory?.length ? (
                <EmptyChart message="No findings recorded yet." />
              ) : (
                <ChartContainer config={chartConfig} className="h-64 w-full">
                  <ResponsiveContainer>
                    <BarChart data={data.byCategory}>
                      <CartesianGrid vertical={false} stroke="var(--border)" />
                      <XAxis dataKey="c" tickLine={false} axisLine={false} fontSize={11} />
                      <YAxis tickLine={false} axisLine={false} fontSize={11} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="n" fill="var(--accent)" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

          {/* Findings by product */}
          <Card className="shadow-card">
            <CardHeader className="pb-2"><CardTitle className="text-base">Findings by product</CardTitle></CardHeader>
            <CardContent>
              {isLoading ? <ChartSkeleton /> : !data?.byProduct?.length ? (
                <EmptyChart message="No findings recorded yet." />
              ) : (
                <ChartContainer config={chartConfig} className="h-56 w-full">
                  <ResponsiveContainer>
                    <BarChart data={data.byProduct} layout="vertical">
                      <CartesianGrid horizontal={false} stroke="var(--border)" />
                      <XAxis type="number" tickLine={false} axisLine={false} fontSize={11} />
                      <YAxis type="category" dataKey="p" tickLine={false} axisLine={false} fontSize={11} width={110} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="n" fill="var(--primary)" radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

          {/* A11y compliance trend */}
          <Card className="shadow-card">
            <CardHeader className="pb-2"><CardTitle className="text-base">Accessibility findings resolved over time</CardTitle></CardHeader>
            <CardContent>
              {isLoading ? <ChartSkeleton /> : !data?.a11yTrend?.length ? (
                <EmptyChart message="No accessibility findings recorded yet." />
              ) : (
                <ChartContainer config={chartConfig} className="h-56 w-full">
                  <ResponsiveContainer>
                    <LineChart data={data.a11yTrend}>
                      <CartesianGrid vertical={false} stroke="var(--border)" />
                      <XAxis dataKey="m" tickLine={false} axisLine={false} fontSize={11} />
                      <YAxis domain={[0, 100]} tickLine={false} axisLine={false} fontSize={11} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line dataKey="v" stroke="var(--primary)" strokeWidth={2.5} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

          {/* Acceptance rate trend */}
          <Card className="shadow-card lg:col-span-2">
            <CardHeader className="pb-2"><CardTitle className="text-base">Acceptance rate over time</CardTitle></CardHeader>
            <CardContent>
              {isLoading ? <ChartSkeleton /> : !data?.trend?.length ? (
                <EmptyChart message="No review data yet." />
              ) : (
                <ChartContainer config={chartConfig} className="h-56 w-full">
                  <ResponsiveContainer>
                    <BarChart data={data.trend}>
                      <CartesianGrid vertical={false} stroke="var(--border)" />
                      <XAxis dataKey="m" tickLine={false} axisLine={false} fontSize={11} />
                      <YAxis tickLine={false} axisLine={false} fontSize={11} domain={[0, 100]} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="accept" fill="var(--info)" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

        </div>
      </div>
    </>
  );
}
