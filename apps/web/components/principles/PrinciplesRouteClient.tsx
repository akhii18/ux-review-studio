"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { AppHeader } from "@/components/ui/AppHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

type PrincipleCategory =
  | "Nielsen heuristics"
  | "Cognitive & interaction laws"
  | "Gestalt principles"
  | "Visual design"
  | "Accessibility"
  | "Content & microcopy";

type Principle = {
  name: string;
  category: PrincipleCategory;
  definition: string;
  usedIn: number;
};

const principles: Principle[] = [
  { name: "Jakob's Law", category: "Cognitive & interaction laws", definition: "Users spend most time on other sites, so they expect yours to work the same.", usedIn: 42 },
  { name: "Fitts's Law", category: "Cognitive & interaction laws", definition: "Time to acquire a target is a function of distance and size.", usedIn: 58 },
  { name: "Hick's Law", category: "Cognitive & interaction laws", definition: "Decision time grows with the number and complexity of choices.", usedIn: 31 },
  { name: "Miller's Law", category: "Cognitive & interaction laws", definition: "People can hold ~7 (±2) items in working memory.", usedIn: 27 },
  { name: "Tesler's Law", category: "Cognitive & interaction laws", definition: "Every system has irreducible complexity — designers absorb it.", usedIn: 14 },
  { name: "Doherty Threshold", category: "Cognitive & interaction laws", definition: "Productivity soars when response time stays under 400ms.", usedIn: 19 },
  { name: "Peak-End Rule", category: "Cognitive & interaction laws", definition: "People judge an experience by its peak and its end.", usedIn: 22 },
  { name: "Goal-Gradient Effect", category: "Cognitive & interaction laws", definition: "Motivation increases as people get closer to completion.", usedIn: 16 },
  { name: "Von Restorff Effect", category: "Cognitive & interaction laws", definition: "Items that stand out are more memorable.", usedIn: 24 },
  { name: "Choice Overload", category: "Cognitive & interaction laws", definition: "Too many choices increase cognitive burden and decision delay.", usedIn: 11 },
  { name: "Nielsen — Visibility of system status", category: "Nielsen heuristics", definition: "Keep users informed about what's going on.", usedIn: 33 },
  { name: "Nielsen — Match with real world", category: "Nielsen heuristics", definition: "Speak the user's language with familiar concepts.", usedIn: 18 },
  { name: "Nielsen — User control & freedom", category: "Nielsen heuristics", definition: "Provide clearly marked exits and undo.", usedIn: 21 },
  { name: "Nielsen — Error prevention", category: "Nielsen heuristics", definition: "Prevent problems before they occur.", usedIn: 26 },
  { name: "Nielsen — Recognition over recall", category: "Nielsen heuristics", definition: "Make options visible instead of relying on memory.", usedIn: 17 },
  { name: "Law of Proximity", category: "Gestalt principles", definition: "Objects near each other are perceived as related.", usedIn: 38 },
  { name: "Law of Similarity", category: "Gestalt principles", definition: "Similar elements are perceived as a group.", usedIn: 22 },
  { name: "Law of Common Region", category: "Gestalt principles", definition: "Elements within a shared boundary are perceived as grouped.", usedIn: 15 },
  { name: "Figure-Ground", category: "Gestalt principles", definition: "Users perceive foreground objects distinctly from background.", usedIn: 9 },
  { name: "Visual Hierarchy", category: "Visual design", definition: "Establish order through size, weight, and color.", usedIn: 47 },
  { name: "8pt Spacing Grid", category: "Visual design", definition: "All spacing values are multiples of 4/8.", usedIn: 31 },
  { name: "Whitespace & Breathing Room", category: "Visual design", definition: "Whitespace clarifies relationships and reduces cognitive load.", usedIn: 19 },
  { name: "WCAG 1.4.3 — Contrast (AA)", category: "Accessibility", definition: "Text contrast ≥ 4.5:1 (normal) or 3:1 (large).", usedIn: 52 },
  { name: "WCAG 2.1.1 — Keyboard", category: "Accessibility", definition: "All functionality available via keyboard.", usedIn: 28 },
  { name: "WCAG 2.4.7 — Focus Visible", category: "Accessibility", definition: "Visible focus indicator on all interactive elements.", usedIn: 35 },
  { name: "Clarity over Cleverness", category: "Content & microcopy", definition: "Plain, direct language beats clever phrasing.", usedIn: 24 },
  { name: "Action-Oriented Labels", category: "Content & microcopy", definition: "Button labels describe what happens next.", usedIn: 20 },
];

const allCategories: ("All" | PrincipleCategory)[] = [
  "All",
  "Nielsen heuristics",
  "Cognitive & interaction laws",
  "Gestalt principles",
  "Visual design",
  "Accessibility",
  "Content & microcopy",
];

const palettes = [
  { bg: "#4F7B3A", fg: "#F3EFE0" },
  { bg: "#8E2A6B", fg: "#F4E3EC" },
  { bg: "#2F7A82", fg: "#EFEAD8" },
  { bg: "#0A0838", fg: "#E5DFD3" },
  { bg: "#B14A1F", fg: "#F5E7D8" },
  { bg: "#3E4E8A", fg: "#E8EBF6" },
  { bg: "#5F0229", fg: "#F3DDE4" },
  { bg: "#6B6A2F", fg: "#F3EFD2" },
];

const PATTERN_COUNT = 12;

export function PrinciplesRouteClient() {
  const [cat, setCat] = useState<"All" | PrincipleCategory>("All");
  const [q, setQ] = useState("");

  const list = useMemo(
    () =>
      principles.filter(
        (p) =>
          (cat === "All" || p.category === cat) &&
          (q === "" ||
            p.name.toLowerCase().includes(q.toLowerCase()) ||
            p.definition.toLowerCase().includes(q.toLowerCase())),
      ),
    [cat, q],
  );

  return (
    <>
      <AppHeader
        title="UX Principles"
        subtitle="Governance knowledge base applied automatically by the AI reviewer"
      />
      <div className="flex-1 space-y-4 p-4 md:p-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[260px] flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search principles…"
              className="h-10 pl-9"
              aria-label="Search principles"
            />
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
              className={`min-h-9 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                cat === c
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:bg-secondary"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((principle) => (
            <PrincipleCard
              key={principle.name}
              principle={principle}
              variant={principles.findIndex((x) => x.name === principle.name)}
            />
          ))}
        </div>
      </div>
    </>
  );
}

function PrincipleCard({ principle, variant }: { principle: Principle; variant: number }) {
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
          {shortCategory(principle.category)}
        </Badge>
      </div>
      <div className="space-y-2 bg-card p-5">
        <h3 className="text-lg font-bold leading-tight text-foreground">{principle.name}</h3>
        <p className="text-sm leading-relaxed text-foreground/80">{principle.definition}</p>
        <div className="flex items-center justify-between pt-2 text-[11px] text-muted-foreground">
          <span>{principle.category}</span>
          <span>Used in {principle.usedIn} reviews</span>
        </div>
      </div>
    </Card>
  );
}

function shortCategory(c: PrincipleCategory) {
  switch (c) {
    case "Cognitive & interaction laws":
      return "Law";
    case "Nielsen heuristics":
      return "Heuristic";
    case "Gestalt principles":
      return "Gestalt";
    case "Visual design":
      return "Visual";
    case "Accessibility":
      return "A11y";
    case "Content & microcopy":
      return "Content";
  }
}

function AbstractArt({ pattern, fg }: { pattern: number; fg: string }) {
  const stroke = fg;
  const fill = fg;

  switch (pattern) {
    case 0:
      return (
        <svg viewBox="0 0 120 120" className="h-32 w-32">
          {[55, 42, 30, 18, 8].map((r, i) => (
            <circle key={i} cx="60" cy="60" r={r} fill="none" stroke={stroke} strokeWidth="6" />
          ))}
          <circle cx="60" cy="60" r="4" fill={fill} />
        </svg>
      );
    case 1:
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
    case 2:
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
    case 3:
      return (
        <svg viewBox="0 0 120 120" className="h-32 w-32">
          {Array.from({ length: 36 }).map((_, i) => {
            const x = 18 + (i % 6) * 17;
            const y = 18 + Math.floor(i / 6) * 17;
            return <circle key={i} cx={x} cy={y} r="4" fill={fill} />;
          })}
        </svg>
      );
    case 4:
      return (
        <svg viewBox="0 0 120 120" className="h-32 w-32">
          <polygon points="60,12 110,100 10,100" fill="none" stroke={stroke} strokeWidth="5" />
          <polygon points="60,32 92,90 28,90" fill="none" stroke={stroke} strokeWidth="5" />
          <polygon points="60,52 76,80 44,80" fill={fill} />
        </svg>
      );
    case 5:
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
    case 6:
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
    case 7:
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
    case 8:
      return (
        <svg viewBox="0 0 120 120" className="h-32 w-32">
          {[50, 38, 26, 14].map((r, i) => {
            const pts = Array.from({ length: 6 })
              .map((_, k) => {
                const a = (Math.PI / 3) * k - Math.PI / 2;
                return `${60 + r * Math.cos(a)},${60 + r * Math.sin(a)}`;
              })
              .join(" ");

            return (
              <polygon
                key={i}
                points={pts}
                fill="none"
                stroke={stroke}
                strokeWidth="5"
                opacity={1 - i * 0.18}
              />
            );
          })}
        </svg>
      );
    case 9:
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
    case 10:
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
    default:
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
