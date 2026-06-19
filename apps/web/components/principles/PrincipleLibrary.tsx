"use client";

import { useState, useMemo } from "react";
import { Search, BookMarked } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { PrincipleCard } from "./PrincipleCard";
import { CustomPrincipleForm } from "./CustomPrincipleForm";
import { useGetPrinciplesQuery } from "@/store/api/principlesApi";
import { PRINCIPLE_CATEGORY_LABELS } from "@uxm/shared";
import { cn } from "@/lib/utils";

export function PrincipleLibrary() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("ALL");
  const [enabledOnly, setEnabledOnly] = useState(false);

  const { data: principles = [], isLoading } = useGetPrinciplesQuery({
    ...(enabledOnly && { enabled: true }),
  });

  const categories = useMemo(() => {
    const cats = new Set(principles.map((p) => p.category));
    return ["ALL", ...Array.from(cats)];
  }, [principles]);

  const filtered = useMemo(() => {
    const lq = q.toLowerCase();
    return principles.filter((p) => {
      if (cat !== "ALL" && p.category !== cat) return false;
      if (lq && !p.name.toLowerCase().includes(lq) && !p.description.toLowerCase().includes(lq))
        return false;
      return true;
    });
  }, [principles, q, cat]);

  return (
    <div className="space-y-4">
      {/* Search + controls */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search principles…"
            className="h-10 pl-9"
          />
        </div>
        <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
          <input
            type="checkbox"
            checked={enabledOnly}
            onChange={(e) => setEnabledOnly(e.target.checked)}
            className="rounded"
          />
          Active only
        </label>
        <CustomPrincipleForm />
      </div>

      {/* Category tabs */}
      <div className="flex flex-wrap gap-2">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition",
              cat === c
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:border-primary/40"
            )}
          >
            {c === "ALL"
              ? "All"
              : PRINCIPLE_CATEGORY_LABELS[c as keyof typeof PRINCIPLE_CATEGORY_LABELS] ?? c}
          </button>
        ))}
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
          <BookMarked className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium">
            {principles.length === 0 ? "No principles loaded" : "No principles match your search"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {principles.length === 0
              ? "Run the database seed to load the principle library."
              : "Try a different search or category."}
          </p>
        </div>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            {filtered.length} principle{filtered.length !== 1 ? "s" : ""}
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((p) => (
              <PrincipleCard key={p.id} principle={p} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
