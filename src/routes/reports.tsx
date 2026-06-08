import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppHeader } from "@/components/app-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Download,
  FileText,
  Plus,
  Share2,
  Eye,
  FileType,
  FileSpreadsheet,
  ExternalLink,
  ArrowRight,
  Calendar,
  User,
} from "lucide-react";
import { reports, reportTemplates } from "@/lib/mock-data";

export const Route = createFileRoute("/reports")({
  head: () => ({ meta: [{ title: "Reports — UXNavigator" }] }),
  component: ReportsPage,
});

const previewSections = [
  "Executive summary", "Review scope", "UX score", "Severity breakdown (P0/P1/P2)",
  "Findings by area", "P0 recommendations", "P1 recommendations", "P2 recommendations",
  "Accessibility findings", "Design system observations", "Requirement alignment",
  "Business impact", "Next steps",
];

// Editorial-style cover gradients keyed to template, KPMG-inspired blue/indigo palette.
const coverByTemplate: Record<string, { gradient: string; accent: string; label: string }> = {
  "Executive Summary": {
    gradient: "linear-gradient(135deg,#1e3a8a 0%,#2563eb 55%,#60a5fa 100%)",
    accent: "#1e40af",
    label: "Executive",
  },
  "PRD Alignment Report": {
    gradient: "linear-gradient(135deg,#0f172a 0%,#312e81 60%,#6366f1 100%)",
    accent: "#4f46e5",
    label: "Product",
  },
  "Accessibility Audit": {
    gradient: "linear-gradient(135deg,#064e3b 0%,#0d9488 60%,#5eead4 100%)",
    accent: "#0f766e",
    label: "Accessibility",
  },
  "Designer Fix Report": {
    gradient: "linear-gradient(135deg,#7c2d12 0%,#c2410c 55%,#fb923c 100%)",
    accent: "#c2410c",
    label: "Designer",
  },
  "Design System Compliance": {
    gradient: "linear-gradient(135deg,#3b0764 0%,#7e22ce 55%,#c084fc 100%)",
    accent: "#7e22ce",
    label: "Design system",
  },
};

const statusStyles: Record<string, string> = {
  Final: "bg-[color:var(--success)]/10 text-[color:var(--success)] ring-[color:var(--success)]/30",
  Draft: "bg-muted text-muted-foreground ring-border",
  "In Review": "bg-[color:var(--warning)]/15 text-[color:var(--warning)] ring-[color:var(--warning)]/30",
};

function CoverArt({ variant }: { variant: string }) {
  const common = { width: "100%", height: "100%", viewBox: "0 0 400 225", preserveAspectRatio: "xMidYMid slice" } as const;
  switch (variant) {
    case "Executive":
      // Concentric arcs — strategic horizon
      return (
        <svg {...common} className="absolute inset-0">
          <defs>
            <linearGradient id="exg" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[140, 110, 80, 55, 32].map((r, i) => (
            <circle key={r} cx="320" cy="210" r={r} fill="none" stroke="url(#exg)" strokeWidth={i === 0 ? 1.2 : 0.8} />
          ))}
          <circle cx="320" cy="210" r="6" fill="#ffffff" fillOpacity="0.9" />
          <line x1="0" y1="170" x2="260" y2="170" stroke="#ffffff" strokeOpacity="0.25" strokeWidth="0.8" />
          <line x1="0" y1="190" x2="200" y2="190" stroke="#ffffff" strokeOpacity="0.15" strokeWidth="0.8" />
        </svg>
      );
    case "Product":
      // Grid of dots + tilted rect — product architecture
      return (
        <svg {...common} className="absolute inset-0">
          <defs>
            <pattern id="pdots" width="14" height="14" patternUnits="userSpaceOnUse">
              <circle cx="1.4" cy="1.4" r="1.1" fill="#ffffff" fillOpacity="0.35" />
            </pattern>
          </defs>
          <rect width="400" height="225" fill="url(#pdots)" />
          <g transform="translate(240 40) rotate(12)">
            <rect width="150" height="110" fill="#ffffff" fillOpacity="0.10" stroke="#ffffff" strokeOpacity="0.55" />
            <rect x="14" y="14" width="80" height="10" fill="#ffffff" fillOpacity="0.7" />
            <rect x="14" y="32" width="120" height="6" fill="#ffffff" fillOpacity="0.35" />
            <rect x="14" y="44" width="100" height="6" fill="#ffffff" fillOpacity="0.35" />
            <rect x="14" y="70" width="40" height="28" fill="#ffffff" fillOpacity="0.55" />
            <rect x="62" y="70" width="40" height="28" fill="#ffffff" fillOpacity="0.25" />
          </g>
        </svg>
      );
    case "Accessibility":
      // Concentric waves — inclusion
      return (
        <svg {...common} className="absolute inset-0">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <path
              key={i}
              d={`M -20 ${60 + i * 28} Q 100 ${20 + i * 28} 220 ${60 + i * 28} T 460 ${60 + i * 28}`}
              fill="none"
              stroke="#ffffff"
              strokeOpacity={0.55 - i * 0.07}
              strokeWidth={1}
            />
          ))}
          <circle cx="90" cy="80" r="34" fill="none" stroke="#ffffff" strokeOpacity="0.7" strokeWidth="1.2" />
          <circle cx="90" cy="80" r="6" fill="#ffffff" fillOpacity="0.85" />
        </svg>
      );
    case "Designer":
      // Overlapping circles — color/blend
      return (
        <svg {...common} className="absolute inset-0">
          <g style={{ mixBlendMode: "screen" }}>
            <circle cx="120" cy="120" r="78" fill="#fde68a" fillOpacity="0.55" />
            <circle cx="200" cy="90" r="78" fill="#fca5a5" fillOpacity="0.55" />
            <circle cx="270" cy="140" r="78" fill="#fdba74" fillOpacity="0.55" />
          </g>
          <g fill="#ffffff" fillOpacity="0.85">
            <rect x="30" y="180" width="22" height="22" />
            <rect x="58" y="180" width="22" height="22" fillOpacity="0.5" />
            <rect x="86" y="180" width="22" height="22" fillOpacity="0.25" />
          </g>
        </svg>
      );
    case "Design system":
      // Modular grid + tokens
      return (
        <svg {...common} className="absolute inset-0">
          <defs>
            <pattern id="dsg" width="28" height="28" patternUnits="userSpaceOnUse">
              <path d="M 28 0 L 0 0 0 28" fill="none" stroke="#ffffff" strokeOpacity="0.18" strokeWidth="0.8" />
            </pattern>
          </defs>
          <rect width="400" height="225" fill="url(#dsg)" />
          <g>
            <rect x="40" y="40" width="56" height="56" fill="#ffffff" fillOpacity="0.85" />
            <rect x="110" y="40" width="56" height="56" fill="#ffffff" fillOpacity="0.45" />
            <rect x="180" y="40" width="56" height="56" fill="#ffffff" fillOpacity="0.25" />
            <circle cx="290" cy="68" r="28" fill="#ffffff" fillOpacity="0.7" />
            <rect x="40" y="120" width="196" height="6" fill="#ffffff" fillOpacity="0.6" />
            <rect x="40" y="134" width="140" height="6" fill="#ffffff" fillOpacity="0.35" />
            <rect x="40" y="148" width="170" height="6" fill="#ffffff" fillOpacity="0.25" />
          </g>
        </svg>
      );
    default:
      return null;
  }
}

function ReportsPage() {
  const [tmpl, setTmpl] = useState(reportTemplates[0].id);
  const active = useMemo(() => reportTemplates.find((t) => t.id === tmpl)!, [tmpl]);

  return (
    <>
      <AppHeader title="Reports" subtitle="Generate, preview, and share executive-ready UX reports" />
      <div className="flex-1 space-y-10 p-4 md:p-6">
        {/* Latest reports — editorial grid */}
        <section aria-labelledby="latest-heading">
          <div className="mb-5 flex items-end justify-between gap-4 border-b border-border pb-3">
            <div>
              <h2 id="latest-heading" className="text-2xl font-semibold tracking-tight">
                Latest reports
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {reports.length} executive-ready UX reports across products
              </p>
            </div>
            <Button className="min-h-10">
              <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
              Generate new report
            </Button>
          </div>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {reports.map((r) => {
              const cover = coverByTemplate[r.template] ?? coverByTemplate["Executive Summary"];
              return (
                <article
                  key={r.id}
                  className="group flex flex-col overflow-hidden rounded-none border border-border bg-card shadow-card transition hover:-translate-y-0.5 hover:shadow-lg"
                >
                  {/* Cover */}
                  <div
                    className="relative aspect-[16/9] w-full overflow-hidden"
                    style={{ background: cover.gradient }}
                    aria-hidden="true"
                  >
                    <CoverArt variant={cover.label} />
                    <div
                      className="absolute inset-0 opacity-40 mix-blend-overlay"
                      style={{
                        backgroundImage:
                          "radial-gradient(120% 80% at 80% 20%, rgba(255,255,255,0.55), transparent 60%)",
                      }}
                    />
                    <div className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur">
                      <FileText className="h-3 w-3" aria-hidden="true" />
                      {cover.label}
                    </div>
                    <span
                      className={`absolute right-4 top-4 inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${statusStyles[r.status] ?? "bg-card text-foreground ring-border"}`}
                    >
                      {r.status}
                    </span>
                  </div>

                  {/* Body — KPMG accent bar */}
                  <div className="flex flex-1 flex-col gap-4 p-5">
                    <div className="flex gap-3">
                      <span
                        className="mt-1 block h-7 w-[3px] shrink-0"
                        style={{ background: cover.accent }}
                        aria-hidden="true"
                      />
                      <div className="min-w-0">
                        <h3 className="text-[17px] font-semibold leading-snug tracking-tight">
                          {r.name}
                        </h3>
                        <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">
                          {r.project}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3 w-3" aria-hidden="true" />
                        {r.created}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <User className="h-3 w-3" aria-hidden="true" />
                        {r.by}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <FileText className="h-3 w-3" aria-hidden="true" />
                        {r.template}
                      </span>
                    </div>

                    <div className="mt-auto flex items-center justify-between border-t border-border pt-3">
                      <button
                        className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary transition group-hover:gap-2.5"
                        type="button"
                      >
                        Read report
                        <ArrowRight className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <div className="flex items-center gap-1">
                        <Button size="icon" variant="ghost" aria-label="Preview" className="h-8 w-8">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" aria-label="Download" className="h-8 w-8">
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" aria-label="Share" className="h-8 w-8">
                          <Share2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        {/* Templates */}
        <section aria-labelledby="templates-heading">
          <div className="mb-4 border-b border-border pb-3">
            <h2 id="templates-heading" className="text-2xl font-semibold tracking-tight">
              Report templates
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Start from a role-based template tuned for your audience
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {reportTemplates.map((t) => {
              const cover = coverByTemplate[t.name] ?? coverByTemplate["Executive Summary"];
              const selected = tmpl === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTmpl(t.id)}
                  className={`group flex flex-col rounded-xl border bg-card p-4 text-left shadow-card transition hover:border-primary/40 ${selected ? "border-primary ring-2 ring-primary/20" : "border-border"}`}
                  aria-pressed={selected}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className="mt-0.5 block h-10 w-[3px] shrink-0"
                      style={{ background: cover.accent }}
                      aria-hidden="true"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">{t.name}</p>
                      <p className="text-[11px] text-muted-foreground">{t.audience}</p>
                    </div>
                    <Badge variant="outline" className="text-[10px]">{t.sections} sections</Badge>
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">{t.description}</p>
                </button>
              );
            })}
          </div>
        </section>

        {/* Preview + export */}
        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle className="text-base">{active.name} — Preview</CardTitle>
              <p className="text-xs text-muted-foreground">Only accepted (and edited-then-accepted) findings are included. Proposed, dismissed, and escalated findings are excluded unless you opt in.</p>
            </div>
            <Button variant="outline" size="sm" className="min-h-9"><Eye className="mr-1 h-3.5 w-3.5" aria-hidden="true" />Full preview</Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <ol className="grid gap-2 md:grid-cols-2">
              {previewSections.slice(0, active.sections + 4).map((s, i) => (
                <li key={s} className="flex items-center gap-3 rounded-lg border border-border bg-secondary/40 p-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-card text-[11px] font-semibold text-primary ring-1 ring-border tabular-nums">{i + 1}</span>
                  <span className="text-sm">{s}</span>
                </li>
              ))}
            </ol>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-3">
              <p className="text-xs text-muted-foreground">Export options</p>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" className="min-h-9"><FileText className="mr-1 h-3.5 w-3.5" aria-hidden="true" />PDF</Button>
                <Button variant="outline" size="sm" className="min-h-9"><FileType className="mr-1 h-3.5 w-3.5" aria-hidden="true" />PPTX</Button>
                <Button variant="outline" size="sm" className="min-h-9"><FileSpreadsheet className="mr-1 h-3.5 w-3.5" aria-hidden="true" />DOCX</Button>
                <Button variant="outline" size="sm" className="min-h-9"><ExternalLink className="mr-1 h-3.5 w-3.5" aria-hidden="true" />Push to Jira</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
