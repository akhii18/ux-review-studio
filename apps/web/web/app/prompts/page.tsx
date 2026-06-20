import { AppHeader } from "@/components/ui/AppHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";

const PROMPTS = [
  {
    name: "Input Understanding",
    stage: "Stage 0",
    description: "Classifies uploaded inputs, extracts screen names, summarises product area and user goal, and identifies missing context.",
    agentRole: "Input Understanding Agent",
    usedFor: "All reviews",
  },
  {
    name: "Usability Review",
    stage: "Stage 1",
    description: "Applies Nielsen's 10 heuristics, Fitts's Law, Hick's Law, Miller's Law, and interaction design principles to identify usability issues.",
    agentRole: "Usability Review Agent",
    usedFor: "Full, Standard, Quick reviews",
  },
  {
    name: "Accessibility Review",
    stage: "Stage 2",
    description: "Runs a WCAG 2.2 AA first-pass: contrast, labels, touch targets, focus visibility, keyboard gaps, form accessibility, and semantic structure.",
    agentRole: "Accessibility Review Agent",
    usedFor: "Full, Accessibility-only reviews",
  },
  {
    name: "Content & Microcopy",
    stage: "Stage 3",
    description: "Reviews labels, button text, error messages, empty states, and tone-of-voice for clarity, consistency, and user comprehension.",
    agentRole: "Content UX Agent",
    usedFor: "Full, Content-only reviews",
  },
  {
    name: "Design Consistency",
    stage: "Stage 4",
    description: "Checks button styles, spacing grid adherence, border radii, type scale, icon set consistency, and component variant usage.",
    agentRole: "Design Consistency Agent",
    usedFor: "Full reviews",
  },
  {
    name: "Review Basis Mapping",
    stage: "Stage 5",
    description: "Maps each finding to 1–3 items from the curated UX law / WCAG / Gestalt / Content Principle library with specific explanations.",
    agentRole: "Review Basis Mapping Agent",
    usedFor: "All reviews (post-analysis)",
  },
  {
    name: "Prioritization",
    stage: "Stage 6",
    description: "Deduplicates findings, assigns P0/P1/P2 priority, and computes the UX Score (100 − P0×8 − P1×3 − P2×1).",
    agentRole: "Prioritization Agent",
    usedFor: "All reviews (post-analysis)",
  },
  {
    name: "Report Generation",
    stage: "Stage 7",
    description: "Synthesises all validated findings into a 10-section structured Markdown UX review report.",
    agentRole: "Report Generation Agent",
    usedFor: "All reviews (final stage)",
  },
];

export const metadata = { title: "Prompt Library — UXNavigator" };

export default function PromptsPage() {
  return (
    <>
      <AppHeader title="Prompt Library" subtitle="AI agent prompts used in the review pipeline" />
      <div className="flex-1 space-y-4 p-4 md:p-6">
        <p className="text-sm text-muted-foreground max-w-2xl">
          Each AI review runs through a sequential 8-stage pipeline. These are the agent prompts used at each stage — grounded in the Review Basis Library of 40+ UX laws, WCAG standards, and Gestalt principles.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {PROMPTS.map((p) => (
            <Card key={p.name}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="font-mono text-[10px]">{p.stage}</Badge>
                  <Sparkles className="h-4 w-4 text-muted-foreground" />
                </div>
                <CardTitle className="text-sm">{p.name}</CardTitle>
                <CardDescription className="text-xs">{p.agentRole}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 pt-0">
                <p className="text-xs text-muted-foreground leading-relaxed">{p.description}</p>
                <p className="text-[11px] text-muted-foreground/70">
                  <span className="font-medium">Used for:</span> {p.usedFor}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </>
  );
}
