"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AppHeader } from "@/components/ui/AppHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis, LineChart, Line } from "recharts";
import { TrendingUp, TrendingDown, CheckCircle2, AlertOctagon, FileBarChart, BarChart2 } from "lucide-react";
import { getAnalytics, listReviews } from "@/lib/api";
import { toast } from "@/lib/toast";

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

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function resolveCurrentRangeBounds(
  timeRange: "1m" | "3m" | "6m" | "1y" | "custom",
  customStartDate: string,
  customEndDate: string,
): { start: Date; end: Date } | null {
  const now = new Date();

  if (timeRange === "custom") {
    if (!customStartDate || !customEndDate) return null;
    const start = new Date(`${customStartDate}T00:00:00.000Z`);
    const end = new Date(`${customEndDate}T23:59:59.999Z`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) return null;
    return { start, end };
  }

  const monthsByRange: Record<Exclude<typeof timeRange, "custom">, number> = {
    "1m": 1,
    "3m": 3,
    "6m": 6,
    "1y": 12,
  };

  const start = new Date(now);
  start.setUTCMonth(start.getUTCMonth() - monthsByRange[timeRange]);
  return { start, end: now };
}

function getDeltaPercent(current: number, previous: number): number {
  if (previous === 0) {
    if (current === 0) return 0;
    return 100;
  }

  return Math.round(((current - previous) / Math.abs(previous)) * 100);
}

function formatDeltaLabel(current: number, previous: number): string {
  const delta = getDeltaPercent(current, previous);
  const sign = delta > 0 ? "+" : "";
  return `${sign}${delta}% vs last period`;
}

function formatReviewTypeLabel(value: string): string {
  const label = value.replaceAll("_", " ").trim().toLowerCase();
  if (!label) return value;
  if (label === "full") return "Full UX Review";
  if (label === "prd") return "PRD Alignment Review";
  if (label === "a11y") return "Accessibility Review";
  if (label === "ds") return "Design System Review";
  if (label === "content") return "Content & Microcopy Review";
  if (label === "partial") return "Custom Review";

  return label
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDomainLabel(value: string): string {
  const label = value.replaceAll("_", " ").trim().toLowerCase();
  if (!label) return value;
  if (label === "bfsi") return "Banking & Financial Services";
  if (label === "healthcare") return "Healthcare";
  if (label === "insurance") return "Insurance";
  if (label === "retail") return "Retail";
  if (label === "enterprise") return "Enterprise / B2B";

  return label
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatMonthLabel(value: string): string {
  const match = value.match(/^(\d{4})-(\d{2})$/);
  if (!match) return value;

  const year = match[1].slice(-2);
  const monthIndex = Number(match[2]) - 1;
  const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  const month = months[monthIndex] ?? match[2];
  return `${month}'${year}`;
}

function normalizeOptionList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item) => item.length > 0);
}

export default function AnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [previousData, setPreviousData] = useState<any>(null);
  const [fallbackFilterOptions, setFallbackFilterOptions] = useState<{ products: string[]; domains: string[]; reviewTypes: string[] }>({
    products: [],
    domains: [],
    reviewTypes: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<"1m" | "3m" | "6m" | "1y" | "custom">("1y");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [productFilter, setProductFilter] = useState("all");
  const [domainFilter, setDomainFilter] = useState("all");
  const [reviewTypeFilter, setReviewTypeFilter] = useState("all");
  const optionsDiagToastShownRef = useRef<string | null>(null);

  useEffect(() => {
    listReviews()
      .then((reviews) => {
        const products = Array.from(new Set(
          (reviews ?? [])
            .map((review: any) => (review?.product ?? "").trim())
            .filter((value: string) => value.length > 0)
        )).sort((a, b) => a.localeCompare(b));

        const domains = Array.from(new Set(
          (reviews ?? [])
            .map((review: any) => (review?.domain ?? "").trim())
            .filter((value: string) => value.length > 0)
        )).sort((a, b) => a.localeCompare(b));

        const reviewTypes = Array.from(new Set(
          (reviews ?? [])
            .map((review: any) => (review?.reviewType ?? "").trim())
            .filter((value: string) => value.length > 0)
        )).sort((a, b) => a.localeCompare(b));

        setFallbackFilterOptions({ products, domains, reviewTypes });
      })
      .catch((err) => {
        console.error("Failed to build fallback analytics options", err);
      });
  }, []);

  useEffect(() => {
    const currentBounds = resolveCurrentRangeBounds(timeRange, customStartDate, customEndDate);
    if (!currentBounds) {
      setData(null);
      setPreviousData(null);
      setIsLoading(false);
      return;
    }

    const currentParams: Record<string, string> =
      timeRange === "custom"
        ? { range: "custom", startDate: customStartDate, endDate: customEndDate }
        : { range: timeRange };

    if (productFilter !== "all") currentParams.product = productFilter;
    if (domainFilter !== "all") currentParams.domain = domainFilter;
    if (reviewTypeFilter !== "all") currentParams.reviewType = reviewTypeFilter;

    const currentDurationMs = currentBounds.end.getTime() - currentBounds.start.getTime();
    const previousEnd = new Date(currentBounds.start.getTime() - 1);
    const previousStart = new Date(previousEnd.getTime() - currentDurationMs);

    const previousParams: Record<string, string> = {
      range: "custom",
      startDate: toIsoDate(previousStart),
      endDate: toIsoDate(previousEnd),
    };

    if (productFilter !== "all") previousParams.product = productFilter;
    if (domainFilter !== "all") previousParams.domain = domainFilter;
    if (reviewTypeFilter !== "all") previousParams.reviewType = reviewTypeFilter;

    setIsLoading(true);
    Promise.all([getAnalytics(currentParams), getAnalytics(previousParams)])
      .then(([currentRes, previousRes]) => {
        setData(currentRes);
        setPreviousData(previousRes);
      })
      .catch((err) => {
        console.error(err);
        toast.error(`Failed to load analytics data: ${err?.message ?? "Unknown error"}`);
      })
      .finally(() => setIsLoading(false));
  }, [timeRange, customStartDate, customEndDate, productFilter, domainFilter, reviewTypeFilter]);

  const filterOptions = useMemo(() => {
    const fromAnalytics = data?.filterOptions ?? { products: [], domains: [], reviewTypes: [] };
    const analyticsProducts = normalizeOptionList(fromAnalytics.products);
    const analyticsDomains = normalizeOptionList(fromAnalytics.domains);
    const analyticsReviewTypes = normalizeOptionList(fromAnalytics.reviewTypes);

    const products = analyticsProducts.length > 0
      ? analyticsProducts
      : fallbackFilterOptions.products;
    const domains = analyticsDomains.length > 0
      ? analyticsDomains
      : fallbackFilterOptions.domains;
    const reviewTypes = analyticsReviewTypes.length > 0
      ? analyticsReviewTypes
      : fallbackFilterOptions.reviewTypes;

    return {
      products: Array.from(new Set(products)).sort((a, b) => a.localeCompare(b)),
      domains: Array.from(new Set(domains)).sort((a, b) => a.localeCompare(b)),
      reviewTypes: Array.from(new Set(reviewTypes)).sort((a, b) => a.localeCompare(b)),
      diagnostics: {
        fromAnalyticsProducts: analyticsProducts.length,
        fromAnalyticsDomains: analyticsDomains.length,
        fromAnalyticsReviewTypes: analyticsReviewTypes.length,
        fromFallbackProducts: fallbackFilterOptions.products.length,
        fromFallbackDomains: fallbackFilterOptions.domains.length,
        fromFallbackReviewTypes: fallbackFilterOptions.reviewTypes.length,
      },
    };
  }, [data?.filterOptions, fallbackFilterOptions]);

  useEffect(() => {
    const products = filterOptions.products ?? [];
    const domains = filterOptions.domains ?? [];
    const reviewTypes = filterOptions.reviewTypes ?? [];

    if (productFilter !== "all" && !products.includes(productFilter)) setProductFilter("all");
    if (domainFilter !== "all" && !domains.includes(domainFilter)) setDomainFilter("all");
    if (reviewTypeFilter !== "all" && !reviewTypes.includes(reviewTypeFilter)) setReviewTypeFilter("all");

    if (!isLoading && products.length === 0 && domains.length === 0 && reviewTypes.length === 0) {
      const diagKey = `${products.length}-${domains.length}-${reviewTypes.length}-${JSON.stringify(filterOptions.diagnostics)}`;
      if (optionsDiagToastShownRef.current !== diagKey) {
        optionsDiagToastShownRef.current = diagKey;
        toast.warning(`Analytics filters have no options. Diagnostics: ${JSON.stringify(filterOptions.diagnostics)}`, {
          duration: 10000,
        });
      }
    }
  }, [filterOptions, productFilter, domainFilter, reviewTypeFilter, isLoading]);

  const reviewTypeOptions = [...filterOptions.reviewTypes].sort((a: string, b: string) => {
    const aValue = a.toLowerCase();
    const bValue = b.toLowerCase();
    const aIsCustom = aValue === "custom" || aValue.includes("custom");
    const bIsCustom = bValue === "custom" || bValue.includes("custom");
    if (aIsCustom === bIsCustom) return 0;
    return aIsCustom ? 1 : -1;
  });

  const kpis = data ? [
    {
      l: "Avg UX score",
      v: data.kpis.avgUxScore ? String(data.kpis.avgUxScore) : "—",
      current: Number(data.kpis.avgUxScore || 0),
      previous: Number(previousData?.kpis?.avgUxScore || 0),
      icon: TrendingUp,
    },
    {
      l: "Acceptance rate",
      v: `${data.kpis.acceptanceRate || 0}%`,
      current: Number(data.kpis.acceptanceRate || 0),
      previous: Number(previousData?.kpis?.acceptanceRate || 0),
      icon: CheckCircle2,
    },
    {
      l: "Dismissal rate",
      v: `${data.kpis.dismissalRate || 0}%`,
      current: Number(data.kpis.dismissalRate || 0),
      previous: Number(previousData?.kpis?.dismissalRate || 0),
      icon: AlertOctagon,
    },
    {
      l: "Total reviews",
      v: String(data.kpis.totalReviews || data.kpis.completedReviews || 0),
      current: Number(data.kpis.totalReviews || data.kpis.completedReviews || 0),
      previous: Number(previousData?.kpis?.totalReviews || previousData?.kpis?.completedReviews || 0),
      icon: BarChart2,
    },
    {
      l: "Total findings",
      v: String(data.kpis.totalFindings || 0),
      current: Number(data.kpis.totalFindings || 0),
      previous: Number(previousData?.kpis?.totalFindings || 0),
      icon: FileBarChart,
    },
    {
      l: "P0 blockers",
      v: String(data.kpis.p0Count || 0),
      current: Number(data.kpis.p0Count || 0),
      previous: Number(previousData?.kpis?.p0Count || 0),
      icon: AlertOctagon,
    },
  ] : [];

  return (
    <>
      <AppHeader title="Analytics" subtitle="Value, trust, and governance metrics across products" />
      <div className="flex-1 space-y-5 p-4 md:p-6">

        {/* Filters */}
        <div className="space-y-2">
          <div className="flex flex-row flex-wrap items-start gap-2">
          <Select value={productFilter} onValueChange={setProductFilter}>
            <SelectTrigger className="h-10 w-40" aria-label="Product">
              <SelectValue placeholder="Product" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All products</SelectItem>
              {filterOptions.products.map((product: string) => (
                <SelectItem key={product} value={product}>{product}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={domainFilter} onValueChange={setDomainFilter}>
            <SelectTrigger className="h-10 w-40" aria-label="Domain">
              <SelectValue placeholder="Domain" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All domains</SelectItem>
              {filterOptions.domains.map((domain: string) => (
                <SelectItem key={domain} value={domain}>{formatDomainLabel(domain)}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={reviewTypeFilter} onValueChange={setReviewTypeFilter}>
            <SelectTrigger className="h-10 w-40" aria-label="Review type">
              <SelectValue placeholder="Review type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All review types</SelectItem>
              {reviewTypeOptions.map((type: string) => (
                <SelectItem key={type} value={type}>{formatReviewTypeLabel(type)}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex flex-col gap-2">
            <Select value={timeRange} onValueChange={(value: "1m" | "3m" | "6m" | "1y" | "custom") => setTimeRange(value)}>
              <SelectTrigger className="h-10 w-40" aria-label="Time range">
                <SelectValue placeholder="Time range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1m">1 month</SelectItem>
                <SelectItem value="3m">3 months</SelectItem>
                <SelectItem value="6m">6 months</SelectItem>
                <SelectItem value="1y">1 year</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>

            {timeRange === "custom" && (
              <div className="flex flex-wrap items-start gap-2">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">From</p>
                  <Input
                    type="date"
                    className="h-10 w-40"
                    aria-label="Start date"
                    value={customStartDate}
                    onChange={(event) => setCustomStartDate(event.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">To</p>
                  <Input
                    type="date"
                    className="h-10 w-40"
                    aria-label="End date"
                    value={customEndDate}
                    onChange={(event) => setCustomEndDate(event.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          </div>
        </div>

        {/* KPIs */}
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          {isLoading
            ? Array.from({ length: 6 }).map((_, i) => <KpiSkeleton key={i} />)
            : kpis.map((k) => {
              const isUp = k.current >= k.previous;
              const deltaText = formatDeltaLabel(k.current, k.previous);

              return (
                <Card key={k.l} className="shadow-card">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{k.l}</p>
                      <k.icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    </div>
                    <p className="mt-1 text-2xl font-semibold tabular-nums">{k.v}</p>
                    <p className={isUp ? "mt-1 flex items-center gap-1 text-[11px] text-green-600" : "mt-1 flex items-center gap-1 text-[11px] text-red-500"}>
                      {isUp
                        ? <TrendingUp className="h-3 w-3" aria-hidden="true" />
                        : <TrendingDown className="h-3 w-3" aria-hidden="true" />}
                      {deltaText}
                    </p>
                  </CardContent>
                </Card>
              );
            })
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
                <ChartContainer
                  config={chartConfig}
                  className="h-64 w-full"
                  ariaLabel="Line chart showing UX score trend over time"
                >
                  <ResponsiveContainer>
                    <AreaChart data={data.trend}>
                      <defs>
                        <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="var(--primary)" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid vertical={false} stroke="var(--border)" />
                      <XAxis dataKey="m" tickLine={false} axisLine={false} fontSize={11} tickFormatter={formatMonthLabel} />
                      <YAxis tickLine={false} axisLine={false} fontSize={11} domain={[0, 100]} />
                      <ChartTooltip content={<ChartTooltipContent labelFormatter={(label) => formatMonthLabel(String(label))} />} />
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
                <ChartContainer
                  config={chartConfig}
                  className="h-64 w-full"
                  ariaLabel="Bar chart showing findings grouped by area"
                >
                  <ResponsiveContainer>
                    <BarChart data={data.byCategory}>
                      <CartesianGrid vertical={false} stroke="var(--border)" />
                      <XAxis
                        dataKey="c"
                        tickLine={false}
                        axisLine={false}
                        fontSize={10}
                        interval={0}
                        angle={-30}
                        textAnchor="end"
                        height={72}
                        tickMargin={6}
                      />
                      <YAxis tickLine={false} axisLine={false} fontSize={11} />
                      <ChartTooltip content={<ChartTooltipContent labelFormatter={(label) => formatMonthLabel(String(label))} />} />
                      <Bar dataKey="n" fill="#ef4444" radius={[6, 6, 0, 0]} />
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
                <ChartContainer
                  config={chartConfig}
                  className="h-56 w-full"
                  ariaLabel="Horizontal bar chart showing findings grouped by product"
                >
                  <ResponsiveContainer>
                    <BarChart data={data.byProduct} layout="vertical">
                      <CartesianGrid horizontal={false} stroke="var(--border)" />
                      <XAxis type="number" tickLine={false} axisLine={false} fontSize={11} />
                      <YAxis type="category" dataKey="p" tickLine={false} axisLine={false} fontSize={11} width={110} />
                      <ChartTooltip content={<ChartTooltipContent labelFormatter={(label) => formatMonthLabel(String(label))} />} />
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
                <ChartContainer
                  config={chartConfig}
                  className="h-56 w-full"
                  ariaLabel="Line chart showing accessibility findings resolved over time"
                >
                  <ResponsiveContainer>
                    <LineChart data={data.a11yTrend}>
                      <CartesianGrid vertical={false} stroke="var(--border)" />
                      <XAxis dataKey="m" tickLine={false} axisLine={false} fontSize={11} tickFormatter={formatMonthLabel} />
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
                <ChartContainer
                  config={chartConfig}
                  className="h-56 w-full"
                  ariaLabel="Bar chart showing acceptance rate over time"
                >
                  <ResponsiveContainer>
                    <BarChart data={data.trend}>
                      <CartesianGrid vertical={false} stroke="var(--border)" />
                      <XAxis dataKey="m" tickLine={false} axisLine={false} fontSize={11} tickFormatter={formatMonthLabel} />
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
