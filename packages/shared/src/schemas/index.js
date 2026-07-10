"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateSettingsSchema = exports.UpdatePrincipleSchema = exports.CreatePrincipleSchema = exports.ApproveChecklistSchema = exports.UpdateChecklistSchema = exports.CreateChecklistSchema = exports.ChecklistItemSchema = exports.FindingsQuerySchema = exports.EscalateFindingSchema = exports.TriageFindingSchema = exports.UpdateFindingSchema = exports.ReviewBasisItemSchema = exports.PrincipleCategorySchema = exports.ChecklistStatusSchema = exports.FindingStatusSchema = exports.SeveritySchema = exports.ReviewAreaSchema = void 0;
const zod_1 = require("zod");
// ── Enums ─────────────────────────────────────────────────────────────────────
exports.ReviewAreaSchema = zod_1.z.enum([
    "USABILITY",
    "ACCESSIBILITY",
    "CONSISTENCY",
    "CONTENT_UX",
    "RISK",
    "RECOMMENDATIONS",
]);
exports.SeveritySchema = zod_1.z.enum(["P0", "P1", "P2"]);
exports.FindingStatusSchema = zod_1.z.enum([
    "PROPOSED",
    "ACCEPTED",
    "EDITED",
    "DISMISSED",
    "ESCALATED",
]);
exports.ChecklistStatusSchema = zod_1.z.enum(["DRAFT", "APPROVED", "DEPRECATED"]);
exports.PrincipleCategorySchema = zod_1.z.enum([
    "NIELSEN_HEURISTICS",
    "COGNITIVE_LAWS",
    "GESTALT",
    "VISUAL_DESIGN",
    "ACCESSIBILITY_WCAG",
    "CONTENT_MICROCOPY",
    "CUSTOM",
]);
exports.ReviewBasisItemSchema = zod_1.z.object({
    id: zod_1.z.string().optional(),
    type: zod_1.z.string(),
    name: zod_1.z.string(),
    explanation: zod_1.z.string().default(""),
});
// ── Findings ──────────────────────────────────────────────────────────────────
exports.UpdateFindingSchema = zod_1.z.object({
    title: zod_1.z.string().min(1).optional(),
    description: zod_1.z.string().optional(),
    recommendation: zod_1.z.string().optional(),
    severity: exports.SeveritySchema.optional(),
    notes: zod_1.z.string().optional(),
    status: exports.FindingStatusSchema.optional(),
    reviewBasis: zod_1.z.array(exports.ReviewBasisItemSchema).optional(),
});
exports.TriageFindingSchema = zod_1.z.object({
    action: zod_1.z.enum(["ACCEPT", "EDIT", "DISMISS", "ESCALATE"]),
    title: zod_1.z.string().min(1).optional(),
    description: zod_1.z.string().optional(),
    recommendation: zod_1.z.string().optional(),
    severity: exports.SeveritySchema.optional(),
    notes: zod_1.z.string().optional(),
    reviewBasis: zod_1.z.array(exports.ReviewBasisItemSchema).optional(),
});
exports.EscalateFindingSchema = zod_1.z.object({
    emails: zod_1.z.array(zod_1.z.string().email("Invalid email address")).min(1, "At least one email is required"),
    recipients: zod_1.z.array(zod_1.z.object({
        label: zod_1.z.string().min(1),
        email: zod_1.z.string().email("Invalid email address").optional(),
    })).optional(),
    reason: zod_1.z.string().min(1, "Escalation reason is required"),
});
exports.FindingsQuerySchema = zod_1.z.object({
    area: exports.ReviewAreaSchema.optional(),
    status: exports.FindingStatusSchema.optional(),
    severity: exports.SeveritySchema.optional(),
    page: zod_1.z.coerce.number().int().min(1).default(1),
    pageSize: zod_1.z.coerce.number().int().min(1).max(100).default(20),
    sortBy: zod_1.z.enum(["severity", "confidence", "createdAt"]).default("severity"),
    sortOrder: zod_1.z.enum(["asc", "desc"]).default("desc"),
});
// ── Checklists ────────────────────────────────────────────────────────────────
exports.ChecklistItemSchema = zod_1.z.object({
    label: zod_1.z.string().min(1),
    description: zod_1.z.string().optional(),
    principleId: zod_1.z.string().optional(),
    area: exports.ReviewAreaSchema.optional(),
    required: zod_1.z.boolean().default(true),
    order: zod_1.z.number().int().min(0).default(0),
});
exports.CreateChecklistSchema = zod_1.z.object({
    title: zod_1.z.string().min(1),
    description: zod_1.z.string().optional(),
    items: zod_1.z.array(exports.ChecklistItemSchema).default([]),
});
exports.UpdateChecklistSchema = zod_1.z.object({
    title: zod_1.z.string().min(1).optional(),
    description: zod_1.z.string().optional(),
    items: zod_1.z
        .array(exports.ChecklistItemSchema.extend({
        id: zod_1.z.string().optional(),
    }))
        .optional(),
});
exports.ApproveChecklistSchema = zod_1.z.object({
    approvedBy: zod_1.z.string().min(1),
});
// ── Principles ────────────────────────────────────────────────────────────────
exports.CreatePrincipleSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    description: zod_1.z.string().min(1),
    category: exports.PrincipleCategorySchema,
    source: zod_1.z.string().optional(),
    enabled: zod_1.z.boolean().default(true),
});
exports.UpdatePrincipleSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).optional(),
    description: zod_1.z.string().optional(),
    category: exports.PrincipleCategorySchema.optional(),
    source: zod_1.z.string().optional(),
    enabled: zod_1.z.boolean().optional(),
});
// ── Settings ──────────────────────────────────────────────────────────────────
exports.UpdateSettingsSchema = zod_1.z.object({
    review_depth: zod_1.z.enum(["quick", "standard", "deep"]).optional(),
    review_confidence_threshold: zod_1.z.number().int().min(50).max(99).optional(),
    checklist_require_approval: zod_1.z.boolean().optional(),
    show_ai_confidence: zod_1.z.boolean().optional(),
    default_review_owner: zod_1.z.string().optional(),
    enable_usability_checks: zod_1.z.boolean().optional(),
    enable_accessibility_checks: zod_1.z.boolean().optional(),
    enable_content_checks: zod_1.z.boolean().optional(),
    enable_consistency_checks: zod_1.z.boolean().optional(),
});
