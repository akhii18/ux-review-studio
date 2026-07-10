import { z } from "zod";

// ── Enums ─────────────────────────────────────────────────────────────────────

export const ReviewAreaSchema = z.enum([
  "USABILITY",
  "ACCESSIBILITY",
  "CONSISTENCY",
  "CONTENT_UX",
  "RISK",
  "RECOMMENDATIONS",
]);

export const SeveritySchema = z.enum(["P0", "P1", "P2"]);

export const FindingStatusSchema = z.enum([
  "PROPOSED",
  "ACCEPTED",
  "EDITED",
  "DISMISSED",
  "ESCALATED",
]);

export const ChecklistStatusSchema = z.enum(["DRAFT", "APPROVED", "DEPRECATED"]);

export const PrincipleCategorySchema = z.enum([
  "NIELSEN_HEURISTICS",
  "COGNITIVE_LAWS",
  "GESTALT",
  "VISUAL_DESIGN",
  "ACCESSIBILITY_WCAG",
  "CONTENT_MICROCOPY",
  "CUSTOM",
]);

export const ReviewBasisItemSchema = z.object({
  id: z.string().optional(),
  type: z.string(),
  name: z.string(),
  explanation: z.string().default(""),
});

// ── Findings ──────────────────────────────────────────────────────────────────

export const UpdateFindingSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  recommendation: z.string().optional(),
  severity: SeveritySchema.optional(),
  notes: z.string().optional(),
  status: FindingStatusSchema.optional(),
  reviewBasis: z.array(ReviewBasisItemSchema).optional(),
});

export const TriageFindingSchema = z.object({
  action: z.enum(["ACCEPT", "EDIT", "DISMISS", "ESCALATE"]),
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  recommendation: z.string().optional(),
  severity: SeveritySchema.optional(),
  notes: z.string().optional(),
  reviewBasis: z.array(ReviewBasisItemSchema).optional(),
});


export const EscalateFindingSchema = z.object({
  emails: z.array(z.string().email("Invalid email address")).min(1, "At least one email is required"),
  recipients: z.array(z.object({
    label: z.string().min(1),
    email: z.string().email("Invalid email address").optional(),
  })).optional(),
  reason: z.string().min(1, "Escalation reason is required"),
});

export const FindingsQuerySchema = z.object({
  area: ReviewAreaSchema.optional(),
  status: FindingStatusSchema.optional(),
  severity: SeveritySchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(["severity", "confidence", "createdAt"]).default("severity"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

// ── Checklists ────────────────────────────────────────────────────────────────

export const ChecklistItemSchema = z.object({
  label: z.string().min(1),
  description: z.string().optional(),
  principleId: z.string().optional(),
  area: ReviewAreaSchema.optional(),
  required: z.boolean().default(true),
  order: z.number().int().min(0).default(0),
});

export const CreateChecklistSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  items: z.array(ChecklistItemSchema).default([]),
});

export const UpdateChecklistSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  items: z
    .array(
      ChecklistItemSchema.extend({
        id: z.string().optional(),
      })
    )
    .optional(),
});

export const ApproveChecklistSchema = z.object({
  approvedBy: z.string().min(1),
});

// ── Principles ────────────────────────────────────────────────────────────────

export const CreatePrincipleSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  category: PrincipleCategorySchema,
  source: z.string().optional(),
  enabled: z.boolean().default(true),
});

export const UpdatePrincipleSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  category: PrincipleCategorySchema.optional(),
  source: z.string().optional(),
  enabled: z.boolean().optional(),
});

// ── Settings ──────────────────────────────────────────────────────────────────

export const UpdateSettingsSchema = z.object({
  review_depth: z.enum(["quick", "standard", "deep"]).optional(),
  review_confidence_threshold: z.number().int().min(50).max(99).optional(),
  checklist_require_approval: z.boolean().optional(),
  show_ai_confidence: z.boolean().optional(),
  default_review_owner: z.string().optional(),
  enable_usability_checks: z.boolean().optional(),
  enable_accessibility_checks: z.boolean().optional(),
  enable_content_checks: z.boolean().optional(),
  enable_consistency_checks: z.boolean().optional(),
});

// ── Type exports (inferred from schemas) ─────────────────────────────────────

export type UpdateFinding = z.infer<typeof UpdateFindingSchema>;
export type TriageFinding = z.infer<typeof TriageFindingSchema>;
export type EscalateFinding = z.infer<typeof EscalateFindingSchema>;
export type FindingsQuery = z.infer<typeof FindingsQuerySchema>;
export type CreateChecklist = z.infer<typeof CreateChecklistSchema>;
export type UpdateChecklist = z.infer<typeof UpdateChecklistSchema>;
export type ApproveChecklist = z.infer<typeof ApproveChecklistSchema>;
export type CreatePrinciple = z.infer<typeof CreatePrincipleSchema>;
export type UpdatePrinciple = z.infer<typeof UpdatePrincipleSchema>;
export type UpdateSettings = z.infer<typeof UpdateSettingsSchema>;
