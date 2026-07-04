import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppHeader } from "@/components/app-header";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";
import { principles, type PrincipleCategory, type Principle } from "@/lib/mock-data";

export const Route = createFileRoute("/principles")({
  head: () => ({ meta: [{ title: "UX Principles — UXNavigator" }] }),
  component: Principles,
});

const allCategories: ("All" | PrincipleCategory)[] = [
  "All", "Nielsen heuristics", "Cognitive & interaction laws", "Gestalt principles",
  "Visual design", "Accessibility", "Content & microcopy",
];

function Principles() {
  const [cat, setCat] = useState<"All" | PrincipleCategory>("All");
  const [q, setQ] = useState("");
  const list = useMemo(
    () => principles.filter(
      (p) => (cat === "All" || p.category === cat) &&
        (q === "" || p.name.toLowerCase().includes(q.toLowerCase()) || p.definition.toLowerCase().includes(q.toLowerCase()))
    ),
    [cat, q],
  );

  return (
    <>
      <AppHeader title="UX Principles" subtitle="Governance knowledge base applied automatically by the AI reviewer" />
      <div className="flex-1 space-y-4 p-4 md:p-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[260px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search principles…" className="h-10 pl-9" aria-label="Search principles" />
          </div>
          <p className="text-xs text-muted-foreground">{list.length} active principles</p>
        </div>

        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Principle categories">
          {allCategories.map((c) => (
            <button
              key={c}
              role="tab"
              aria-selected={cat === c}
              onClick={() => setCat(c)}
              className={`min-h-9 rounded-full border px-3 py-1.5 text-xs font-medium transition ${cat === c ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground hover:bg-secondary"}`}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((p) => (
            <PrincipleCard
              key={p.name}
              principle={p}
              variant={principles.findIndex((x) => x.name === p.name)}
            />
          ))}
        </div>
      </div>
    </>
  );
}

/* ---------- Card with abstract art header ---------- */

const palettes = [
  { bg: "#4F7B3A", fg: "#F3EFE0" }, // green
  { bg: "#8E2A6B", fg: "#F4E3EC" }, // magenta
  { bg: "#2F7A82", fg: "#EFEAD8" }, // teal
  { bg: "#0A0838", fg: "#E5DFD3" }, // navy
  { bg: "#B14A1F", fg: "#F5E7D8" }, // burnt orange
  { bg: "#3E4E8A", fg: "#E8EBF6" }, // indigo
  { bg: "#5F0229", fg: "#F3DDE4" }, // deep red
  { bg: "#6B6A2F", fg: "#F3EFD2" }, // olive
];

const PATTERN_COUNT = 12;

function PrincipleCard({ principle: p, variant }: { principle: Principle; variant: number }) {
  // Deterministic, unique (pattern, palette) pair per principle index.
  const idx = variant < 0 ? 0 : variant;
  const pattern = idx % PATTERN_COUNT;
  const palette = palettes[Math.floor(idx / PATTERN_COUNT) % palettes.length];


  return (
    <Card className="group overflow-hidden border-border/60 shadow-card transition hover:-translate-y-0.5 hover:shadow-elegant">
      <div
        className="relative flex h-44 items-center justify-center overflow-hidden"
        style={{ backgroundColor: palette.bg }}
        aria-hidden="true"
      >
        <AbstractArt pattern={pattern} fg={palette.fg} />
        <Badge
          className="absolute right-3 top-3 border-0 text-[10px] uppercase tracking-wide backdrop-blur"
          style={{ backgroundColor: `${palette.fg}33`, color: palette.fg }}
        >
          {shortCategory(p.category)}
        </Badge>
      </div>
      <div className="space-y-2 bg-card p-5">
        <h3 className="text-lg font-bold leading-tight text-foreground">{p.name}</h3>
        <p className="text-sm leading-relaxed text-foreground/80">{p.definition}</p>
        <div className="flex items-center justify-between pt-2 text-[11px] text-muted-foreground">
          <span>{p.category}</span>
          <span>Used in {p.usedIn} reviews</span>
        </div>
      </div>
    </Card>
  );
}

function shortCategory(c: PrincipleCategory) {
  switch (c) {
    case "Cognitive & interaction laws": return "Law";
    case "Nielsen heuristics": return "Heuristic";
    case "Gestalt principles": return "Gestalt";
    case "Visual design": return "Visual";
    case "Accessibility": return "A11y";
    case "Content & microcopy": return "Content";
  }
}

function AbstractArt({ pattern, fg }: { pattern: number; fg: string }) {
  const stroke = fg;
  const fill = fg;
  switch (pattern) {
    case 0: // concentric circles (target)
      return (
        <svg viewBox="0 0 120 120" className="h-32 w-32">
          {[55, 42, 30, 18, 8].map((r, i) => (
            <circle key={i} cx="60" cy="60" r={r} fill="none" stroke={stroke} strokeWidth="6" />
          ))}
          <circle cx="60" cy="60" r="4" fill={fill} />
        </svg>
      );
    case 1: // nested squares
      return (
        <svg viewBox="0 0 120 120" className="h-32 w-32">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <rect
              key={i}
              x={10 + i * 8}
              y={10 + i * 8}
              width={100 - i * 16}
              height={100 - i * 16}
              fill={fill}
              opacity={0.18 + i * 0.13}
            />
          ))}
        </svg>
      );
    case 2: // horizontal bars (stacked)
      return (
        <svg viewBox="0 0 120 120" className="h-32 w-36">
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <rect
              key={i}
              x="10"
              y={12 + i * 14}
              width="100"
              height="9"
              fill={fill}
              opacity={1 - i * 0.12}
            />
          ))}
        </svg>
      );
    case 3: // dot grid
      return (
        <svg viewBox="0 0 120 120" className="h-32 w-32">
          {Array.from({ length: 36 }).map((_, i) => {
            const x = 18 + (i % 6) * 17;
            const y = 18 + Math.floor(i / 6) * 17;
            return <circle key={i} cx={x} cy={y} r="4" fill={fill} />;
          })}
        </svg>
      );
    case 4: // triangles
      return (
        <svg viewBox="0 0 120 120" className="h-32 w-32">
          <polygon points="60,12 110,100 10,100" fill="none" stroke={stroke} strokeWidth="5" />
          <polygon points="60,32 92,90 28,90" fill="none" stroke={stroke} strokeWidth="5" />
          <polygon points="60,52 76,80 44,80" fill={fill} />
        </svg>
      );
    case 5: // arcs / waves
      return (
        <svg viewBox="0 0 140 120" className="h-32 w-40">
          {[0, 1, 2, 3, 4].map((i) => (
            <path
              key={i}
              d={`M10 ${30 + i * 14} Q 70 ${10 + i * 14}, 130 ${30 + i * 14}`}
              fill="none"
              stroke={stroke}
              strokeWidth="5"
              opacity={1 - i * 0.15}
            />
          ))}
        </svg>
      );
    case 6: // diagonal stripes
      return (
        <svg viewBox="0 0 120 120" className="h-32 w-32">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <rect
              key={i}
              x={-20}
              y={i * 22 - 10}
              width="180"
              height="8"
              fill={fill}
              opacity={0.4 + i * 0.1}
              transform="rotate(-20 60 60)"
            />
          ))}
        </svg>
      );
    case 7: // plus grid
      return (
        <svg viewBox="0 0 120 120" className="h-32 w-32">
          {Array.from({ length: 9 }).map((_, i) => {
            const cx = 24 + (i % 3) * 36;
            const cy = 24 + Math.floor(i / 3) * 36;
            return (
              <g key={i} stroke={stroke} strokeWidth="4" strokeLinecap="square">
                <line x1={cx - 8} y1={cy} x2={cx + 8} y2={cy} />
                <line x1={cx} y1={cy - 8} x2={cx} y2={cy + 8} />
              </g>
            );
          })}
        </svg>
      );
    case 8: // concentric hexagons
      return (
        <svg viewBox="0 0 120 120" className="h-32 w-32">
          {[50, 38, 26, 14].map((r, i) => {
            const pts = Array.from({ length: 6 })
              .map((_, k) => {
                const a = (Math.PI / 3) * k - Math.PI / 2;
                return `${60 + r * Math.cos(a)},${60 + r * Math.sin(a)}`;
              })
              .join(" ");
            return <polygon key={i} points={pts} fill="none" stroke={stroke} strokeWidth="5" opacity={1 - i * 0.18} />;
          })}
        </svg>
      );
    case 9: // half-circle stack (rainbow arcs)
      return (
        <svg viewBox="0 0 140 80" className="h-24 w-40">
          {[55, 42, 30, 18, 8].map((r, i) => (
            <path
              key={i}
              d={`M ${70 - r} 70 A ${r} ${r} 0 0 1 ${70 + r} 70`}
              fill="none"
              stroke={stroke}
              strokeWidth="6"
              opacity={1 - i * 0.15}
            />
          ))}
        </svg>
      );
    case 10: // checker squares
      return (
        <svg viewBox="0 0 120 120" className="h-32 w-32">
          {Array.from({ length: 16 }).map((_, i) => {
            const x = (i % 4) * 28 + 4;
            const y = Math.floor(i / 4) * 28 + 4;
            const on = (i + Math.floor(i / 4)) % 2 === 0;
            return on ? <rect key={i} x={x} y={y} width="24" height="24" fill={fill} /> : null;
          })}
        </svg>
      );
    case 11:
    default: // off-center rings
      return (
        <svg viewBox="0 0 120 120" className="h-32 w-32">
          {[44, 34, 24, 14].map((r, i) => (
            <circle
              key={i}
              cx={40 + i * 6}
              cy={60}
              r={r}
              fill="none"
              stroke={stroke}
              strokeWidth="5"
              opacity={1 - i * 0.18}
            />
          ))}
          <circle cx="92" cy="40" r="10" fill={fill} />
        </svg>
      );
  }
}
