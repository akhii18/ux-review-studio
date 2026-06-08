import { createFileRoute } from "@tanstack/react-router";
import { AppHeader } from "@/components/app-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis, LineChart, Line } from "recharts";
import { TrendingUp, TrendingDown, Clock, CheckCircle2, AlertOctagon, FileBarChart } from "lucide-react";

export const Route = createFileRoute("/analytics")({
  head: () => ({ meta: [{ title: "Analytics — UXNavigator" }] }),
  component: Analytics,
});

const trend = [
  { m: "Dec", score: 68, reviews: 8, accept: 72 }, { m: "Jan", score: 71, reviews: 11, accept: 76 },
  { m: "Feb", score: 73, reviews: 14, accept: 78 }, { m: "Mar", score: 75, reviews: 18, accept: 82 },
  { m: "Apr", score: 77, reviews: 21, accept: 85 }, { m: "May", score: 78, reviews: 24, accept: 87 },
];
const categories = [
  { c: "Usability", n: 412 }, { c: "Accessibility", n: 286 }, { c: "Design System", n: 244 },
  { c: "Content", n: 188 }, { c: "Navigation", n: 142 }, { c: "Error Handling", n: 124 },
];
const products = [
  { p: "Banking App", n: 264 }, { p: "Claims Portal", n: 198 }, { p: "Healthcare App", n: 172 },
  { p: "Retail Checkout", n: 138 }, { p: "HR Dashboard", n: 122 },
];
const a11yTrend = [
  { m: "Dec", v: 81 }, { m: "Jan", v: 83 }, { m: "Feb", v: 85 },
  { m: "Mar", v: 87 }, { m: "Apr", v: 90 }, { m: "May", v: 92 },
];

const chartConfig = {
  score: { label: "UX Score", color: "var(--color-primary)" },
  reviews: { label: "Reviews", color: "var(--color-info)" },
  n: { label: "Findings", color: "var(--color-accent)" },
  accept: { label: "Acceptance %", color: "var(--color-primary)" },
  v: { label: "WCAG 2.2 AA %", color: "var(--color-primary)" },
};

const kpis = [
  { l: "Avg UX score", v: "78", d: "+3", up: true, icon: TrendingUp },
  { l: "Acceptance rate", v: "87%", d: "+5%", up: true, icon: CheckCircle2 },
  { l: "Dismissal / false-positive", v: "9%", d: "−2%", up: true, icon: AlertOctagon },
  { l: "Coverage vs human review", v: "94%", d: "+4%", up: true, icon: FileBarChart },
  { l: "Time saved", v: "412 hrs", d: "+58", up: true, icon: Clock },
  { l: "Export conversion", v: "76%", d: "+3%", up: true, icon: FileBarChart },
];

function Analytics() {
  return (
    <>
      <AppHeader title="Analytics" subtitle="Value, trust, and governance metrics across products" />
      <div className="flex-1 space-y-5 p-4 md:p-6">
        <div className="flex flex-row flex-wrap gap-2">
          {["Date range", "Product", "Domain", "Review type", "Owner"].map((f) => (
            <Select key={f}>
              <SelectTrigger className="h-10" style={{ width: 160 }} aria-label={f}>
                <SelectValue placeholder={f} />
              </SelectTrigger>
              <SelectContent><SelectItem value="all">All {f.toLowerCase()}</SelectItem></SelectContent>
            </Select>
          ))}
        </div>

        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          {kpis.map((k) => (
            <Card key={k.l} className="shadow-card"><CardContent className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{k.l}</p>
                <k.icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              </div>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{k.v}</p>
              <p className="flex items-center gap-1 text-[11px] text-[color:var(--success)]">
                {k.up ? <TrendingUp className="h-3 w-3" aria-hidden="true" /> : <TrendingDown className="h-3 w-3" aria-hidden="true" />}
                {k.d} vs last period
              </p>
            </CardContent></Card>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="shadow-card">
            <CardHeader className="pb-2"><CardTitle className="text-base">UX score trend</CardTitle></CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-64 w-full">
                <ResponsiveContainer><AreaChart data={trend}>
                  <defs>
                    <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="var(--color-border)" />
                  <XAxis dataKey="m" tickLine={false} axisLine={false} fontSize={11} />
                  <YAxis tickLine={false} axisLine={false} fontSize={11} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area dataKey="score" stroke="var(--color-primary)" strokeWidth={2} fill="url(#g1)" />
                </AreaChart></ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader className="pb-2"><CardTitle className="text-base">Findings by area</CardTitle></CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-64 w-full">
                <ResponsiveContainer><BarChart data={categories}>
                  <CartesianGrid vertical={false} stroke="var(--color-border)" />
                  <XAxis dataKey="c" tickLine={false} axisLine={false} fontSize={11} />
                  <YAxis tickLine={false} axisLine={false} fontSize={11} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="n" fill="var(--color-accent)" radius={[6, 6, 0, 0]} />
                </BarChart></ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader className="pb-2"><CardTitle className="text-base">Findings by product</CardTitle></CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-56 w-full">
                <ResponsiveContainer><BarChart data={products} layout="vertical">
                  <CartesianGrid horizontal={false} stroke="var(--color-border)" />
                  <XAxis type="number" tickLine={false} axisLine={false} fontSize={11} />
                  <YAxis type="category" dataKey="p" tickLine={false} axisLine={false} fontSize={11} width={110} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="n" fill="var(--color-primary)" radius={[0, 6, 6, 0]} />
                </BarChart></ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader className="pb-2"><CardTitle className="text-base">Accessibility compliance trend (WCAG 2.2 AA)</CardTitle></CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-56 w-full">
                <ResponsiveContainer><LineChart data={a11yTrend}>
                  <CartesianGrid vertical={false} stroke="var(--color-border)" />
                  <XAxis dataKey="m" tickLine={false} axisLine={false} fontSize={11} />
                  <YAxis domain={[60, 100]} tickLine={false} axisLine={false} fontSize={11} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line dataKey="v" stroke="var(--color-primary)" strokeWidth={2.5} dot={{ r: 3 }} />
                </LineChart></ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card className="shadow-card lg:col-span-2">
            <CardHeader className="pb-2"><CardTitle className="text-base">Acceptance rate</CardTitle></CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-56 w-full">
                <ResponsiveContainer><BarChart data={trend}>
                  <CartesianGrid vertical={false} stroke="var(--color-border)" />
                  <XAxis dataKey="m" tickLine={false} axisLine={false} fontSize={11} />
                  <YAxis tickLine={false} axisLine={false} fontSize={11} domain={[0, 100]} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="accept" fill="var(--color-info)" radius={[6, 6, 0, 0]} />
                </BarChart></ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
