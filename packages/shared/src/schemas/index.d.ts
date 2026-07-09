import { z } from "zod";
export declare const ReviewAreaSchema: z.ZodEnum<["USABILITY", "ACCESSIBILITY", "CONSISTENCY", "CONTENT_UX", "RISK", "RECOMMENDATIONS"]>;
export declare const SeveritySchema: z.ZodEnum<["P0", "P1", "P2"]>;
export declare const FindingStatusSchema: z.ZodEnum<["PROPOSED", "ACCEPTED", "EDITED", "DISMISSED", "ESCALATED", "FALSE_POSITIVE"]>;
export declare const ChecklistStatusSchema: z.ZodEnum<["DRAFT", "APPROVED", "DEPRECATED"]>;
export declare const PrincipleCategorySchema: z.ZodEnum<["NIELSEN_HEURISTICS", "COGNITIVE_LAWS", "GESTALT", "VISUAL_DESIGN", "ACCESSIBILITY_WCAG", "CONTENT_MICROCOPY", "CUSTOM"]>;
export declare const ReviewBasisItemSchema: z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    type: z.ZodString;
    name: z.ZodString;
    explanation: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: string;
    name: string;
    explanation: string;
    id?: string | undefined;
}, {
    type: string;
    name: string;
    id?: string | undefined;
    explanation?: string | undefined;
}>;
export declare const UpdateFindingSchema: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    recommendation: z.ZodOptional<z.ZodString>;
    severity: z.ZodOptional<z.ZodEnum<["P0", "P1", "P2"]>>;
    notes: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<["PROPOSED", "ACCEPTED", "EDITED", "DISMISSED", "ESCALATED", "FALSE_POSITIVE"]>>;
    reviewBasis: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodOptional<z.ZodString>;
        type: z.ZodString;
        name: z.ZodString;
        explanation: z.ZodDefault<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        type: string;
        name: string;
        explanation: string;
        id?: string | undefined;
    }, {
        type: string;
        name: string;
        id?: string | undefined;
        explanation?: string | undefined;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    status?: "PROPOSED" | "ACCEPTED" | "EDITED" | "DISMISSED" | "ESCALATED" | "FALSE_POSITIVE" | undefined;
    title?: string | undefined;
    description?: string | undefined;
    recommendation?: string | undefined;
    severity?: "P0" | "P1" | "P2" | undefined;
    notes?: string | undefined;
    reviewBasis?: {
        type: string;
        name: string;
        explanation: string;
        id?: string | undefined;
    }[] | undefined;
}, {
    status?: "PROPOSED" | "ACCEPTED" | "EDITED" | "DISMISSED" | "ESCALATED" | "FALSE_POSITIVE" | undefined;
    title?: string | undefined;
    description?: string | undefined;
    recommendation?: string | undefined;
    severity?: "P0" | "P1" | "P2" | undefined;
    notes?: string | undefined;
    reviewBasis?: {
        type: string;
        name: string;
        id?: string | undefined;
        explanation?: string | undefined;
    }[] | undefined;
}>;
export declare const TriageFindingSchema: z.ZodObject<{
    action: z.ZodEnum<["ACCEPT", "EDIT", "DISMISS", "ESCALATE", "FALSE_POSITIVE"]>;
    title: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    recommendation: z.ZodOptional<z.ZodString>;
    severity: z.ZodOptional<z.ZodEnum<["P0", "P1", "P2"]>>;
    notes: z.ZodOptional<z.ZodString>;
    reviewBasis: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodOptional<z.ZodString>;
        type: z.ZodString;
        name: z.ZodString;
        explanation: z.ZodDefault<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        type: string;
        name: string;
        explanation: string;
        id?: string | undefined;
    }, {
        type: string;
        name: string;
        id?: string | undefined;
        explanation?: string | undefined;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    action: "ACCEPT" | "EDIT" | "DISMISS" | "ESCALATE" | "FALSE_POSITIVE";
    title?: string | undefined;
    description?: string | undefined;
    recommendation?: string | undefined;
    severity?: "P0" | "P1" | "P2" | undefined;
    notes?: string | undefined;
    reviewBasis?: {
        type: string;
        name: string;
        explanation: string;
        id?: string | undefined;
    }[] | undefined;
}, {
    action: "ACCEPT" | "EDIT" | "DISMISS" | "ESCALATE" | "FALSE_POSITIVE";
    title?: string | undefined;
    description?: string | undefined;
    recommendation?: string | undefined;
    severity?: "P0" | "P1" | "P2" | undefined;
    notes?: string | undefined;
    reviewBasis?: {
        type: string;
        name: string;
        id?: string | undefined;
        explanation?: string | undefined;
    }[] | undefined;
}>;
export declare const EscalateFindingSchema: z.ZodObject<{
    reason: z.ZodString;
}, "strip", z.ZodTypeAny, {
    reason: string;
}, {
    reason: string;
}>;
export declare const FindingsQuerySchema: z.ZodObject<{
    area: z.ZodOptional<z.ZodEnum<["USABILITY", "ACCESSIBILITY", "CONSISTENCY", "CONTENT_UX", "RISK", "RECOMMENDATIONS"]>>;
    status: z.ZodOptional<z.ZodEnum<["PROPOSED", "ACCEPTED", "EDITED", "DISMISSED", "ESCALATED", "FALSE_POSITIVE"]>>;
    severity: z.ZodOptional<z.ZodEnum<["P0", "P1", "P2"]>>;
    page: z.ZodDefault<z.ZodNumber>;
    pageSize: z.ZodDefault<z.ZodNumber>;
    sortBy: z.ZodDefault<z.ZodEnum<["severity", "confidence", "createdAt"]>>;
    sortOrder: z.ZodDefault<z.ZodEnum<["asc", "desc"]>>;
}, "strip", z.ZodTypeAny, {
    page: number;
    pageSize: number;
    sortBy: "severity" | "confidence" | "createdAt";
    sortOrder: "asc" | "desc";
    status?: "PROPOSED" | "ACCEPTED" | "EDITED" | "DISMISSED" | "ESCALATED" | "FALSE_POSITIVE" | undefined;
    severity?: "P0" | "P1" | "P2" | undefined;
    area?: "USABILITY" | "ACCESSIBILITY" | "CONSISTENCY" | "CONTENT_UX" | "RISK" | "RECOMMENDATIONS" | undefined;
}, {
    status?: "PROPOSED" | "ACCEPTED" | "EDITED" | "DISMISSED" | "ESCALATED" | "FALSE_POSITIVE" | undefined;
    severity?: "P0" | "P1" | "P2" | undefined;
    area?: "USABILITY" | "ACCESSIBILITY" | "CONSISTENCY" | "CONTENT_UX" | "RISK" | "RECOMMENDATIONS" | undefined;
    page?: number | undefined;
    pageSize?: number | undefined;
    sortBy?: "severity" | "confidence" | "createdAt" | undefined;
    sortOrder?: "asc" | "desc" | undefined;
}>;
export declare const ChecklistItemSchema: z.ZodObject<{
    label: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    principleId: z.ZodOptional<z.ZodString>;
    area: z.ZodOptional<z.ZodEnum<["USABILITY", "ACCESSIBILITY", "CONSISTENCY", "CONTENT_UX", "RISK", "RECOMMENDATIONS"]>>;
    required: z.ZodDefault<z.ZodBoolean>;
    order: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    label: string;
    required: boolean;
    order: number;
    description?: string | undefined;
    area?: "USABILITY" | "ACCESSIBILITY" | "CONSISTENCY" | "CONTENT_UX" | "RISK" | "RECOMMENDATIONS" | undefined;
    principleId?: string | undefined;
}, {
    label: string;
    description?: string | undefined;
    area?: "USABILITY" | "ACCESSIBILITY" | "CONSISTENCY" | "CONTENT_UX" | "RISK" | "RECOMMENDATIONS" | undefined;
    principleId?: string | undefined;
    required?: boolean | undefined;
    order?: number | undefined;
}>;
export declare const CreateChecklistSchema: z.ZodObject<{
    title: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    items: z.ZodDefault<z.ZodArray<z.ZodObject<{
        label: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        principleId: z.ZodOptional<z.ZodString>;
        area: z.ZodOptional<z.ZodEnum<["USABILITY", "ACCESSIBILITY", "CONSISTENCY", "CONTENT_UX", "RISK", "RECOMMENDATIONS"]>>;
        required: z.ZodDefault<z.ZodBoolean>;
        order: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        label: string;
        required: boolean;
        order: number;
        description?: string | undefined;
        area?: "USABILITY" | "ACCESSIBILITY" | "CONSISTENCY" | "CONTENT_UX" | "RISK" | "RECOMMENDATIONS" | undefined;
        principleId?: string | undefined;
    }, {
        label: string;
        description?: string | undefined;
        area?: "USABILITY" | "ACCESSIBILITY" | "CONSISTENCY" | "CONTENT_UX" | "RISK" | "RECOMMENDATIONS" | undefined;
        principleId?: string | undefined;
        required?: boolean | undefined;
        order?: number | undefined;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    title: string;
    items: {
        label: string;
        required: boolean;
        order: number;
        description?: string | undefined;
        area?: "USABILITY" | "ACCESSIBILITY" | "CONSISTENCY" | "CONTENT_UX" | "RISK" | "RECOMMENDATIONS" | undefined;
        principleId?: string | undefined;
    }[];
    description?: string | undefined;
}, {
    title: string;
    description?: string | undefined;
    items?: {
        label: string;
        description?: string | undefined;
        area?: "USABILITY" | "ACCESSIBILITY" | "CONSISTENCY" | "CONTENT_UX" | "RISK" | "RECOMMENDATIONS" | undefined;
        principleId?: string | undefined;
        required?: boolean | undefined;
        order?: number | undefined;
    }[] | undefined;
}>;
export declare const UpdateChecklistSchema: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    items: z.ZodOptional<z.ZodArray<z.ZodObject<{
        label: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        principleId: z.ZodOptional<z.ZodString>;
        area: z.ZodOptional<z.ZodEnum<["USABILITY", "ACCESSIBILITY", "CONSISTENCY", "CONTENT_UX", "RISK", "RECOMMENDATIONS"]>>;
        required: z.ZodDefault<z.ZodBoolean>;
        order: z.ZodDefault<z.ZodNumber>;
    } & {
        id: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        label: string;
        required: boolean;
        order: number;
        id?: string | undefined;
        description?: string | undefined;
        area?: "USABILITY" | "ACCESSIBILITY" | "CONSISTENCY" | "CONTENT_UX" | "RISK" | "RECOMMENDATIONS" | undefined;
        principleId?: string | undefined;
    }, {
        label: string;
        id?: string | undefined;
        description?: string | undefined;
        area?: "USABILITY" | "ACCESSIBILITY" | "CONSISTENCY" | "CONTENT_UX" | "RISK" | "RECOMMENDATIONS" | undefined;
        principleId?: string | undefined;
        required?: boolean | undefined;
        order?: number | undefined;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    title?: string | undefined;
    description?: string | undefined;
    items?: {
        label: string;
        required: boolean;
        order: number;
        id?: string | undefined;
        description?: string | undefined;
        area?: "USABILITY" | "ACCESSIBILITY" | "CONSISTENCY" | "CONTENT_UX" | "RISK" | "RECOMMENDATIONS" | undefined;
        principleId?: string | undefined;
    }[] | undefined;
}, {
    title?: string | undefined;
    description?: string | undefined;
    items?: {
        label: string;
        id?: string | undefined;
        description?: string | undefined;
        area?: "USABILITY" | "ACCESSIBILITY" | "CONSISTENCY" | "CONTENT_UX" | "RISK" | "RECOMMENDATIONS" | undefined;
        principleId?: string | undefined;
        required?: boolean | undefined;
        order?: number | undefined;
    }[] | undefined;
}>;
export declare const ApproveChecklistSchema: z.ZodObject<{
    approvedBy: z.ZodString;
}, "strip", z.ZodTypeAny, {
    approvedBy: string;
}, {
    approvedBy: string;
}>;
export declare const CreatePrincipleSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodString;
    category: z.ZodEnum<["NIELSEN_HEURISTICS", "COGNITIVE_LAWS", "GESTALT", "VISUAL_DESIGN", "ACCESSIBILITY_WCAG", "CONTENT_MICROCOPY", "CUSTOM"]>;
    source: z.ZodOptional<z.ZodString>;
    enabled: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    name: string;
    description: string;
    category: "NIELSEN_HEURISTICS" | "COGNITIVE_LAWS" | "GESTALT" | "VISUAL_DESIGN" | "ACCESSIBILITY_WCAG" | "CONTENT_MICROCOPY" | "CUSTOM";
    enabled: boolean;
    source?: string | undefined;
}, {
    name: string;
    description: string;
    category: "NIELSEN_HEURISTICS" | "COGNITIVE_LAWS" | "GESTALT" | "VISUAL_DESIGN" | "ACCESSIBILITY_WCAG" | "CONTENT_MICROCOPY" | "CUSTOM";
    source?: string | undefined;
    enabled?: boolean | undefined;
}>;
export declare const UpdatePrincipleSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    category: z.ZodOptional<z.ZodEnum<["NIELSEN_HEURISTICS", "COGNITIVE_LAWS", "GESTALT", "VISUAL_DESIGN", "ACCESSIBILITY_WCAG", "CONTENT_MICROCOPY", "CUSTOM"]>>;
    source: z.ZodOptional<z.ZodString>;
    enabled: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    name?: string | undefined;
    description?: string | undefined;
    category?: "NIELSEN_HEURISTICS" | "COGNITIVE_LAWS" | "GESTALT" | "VISUAL_DESIGN" | "ACCESSIBILITY_WCAG" | "CONTENT_MICROCOPY" | "CUSTOM" | undefined;
    source?: string | undefined;
    enabled?: boolean | undefined;
}, {
    name?: string | undefined;
    description?: string | undefined;
    category?: "NIELSEN_HEURISTICS" | "COGNITIVE_LAWS" | "GESTALT" | "VISUAL_DESIGN" | "ACCESSIBILITY_WCAG" | "CONTENT_MICROCOPY" | "CUSTOM" | undefined;
    source?: string | undefined;
    enabled?: boolean | undefined;
}>;
export declare const UpdateSettingsSchema: z.ZodObject<{
    review_depth: z.ZodOptional<z.ZodEnum<["quick", "standard", "deep"]>>;
    review_confidence_threshold: z.ZodOptional<z.ZodNumber>;
    checklist_require_approval: z.ZodOptional<z.ZodBoolean>;
    show_ai_confidence: z.ZodOptional<z.ZodBoolean>;
    default_review_owner: z.ZodOptional<z.ZodString>;
    enable_usability_checks: z.ZodOptional<z.ZodBoolean>;
    enable_accessibility_checks: z.ZodOptional<z.ZodBoolean>;
    enable_content_checks: z.ZodOptional<z.ZodBoolean>;
    enable_consistency_checks: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    review_depth?: "quick" | "standard" | "deep" | undefined;
    review_confidence_threshold?: number | undefined;
    checklist_require_approval?: boolean | undefined;
    show_ai_confidence?: boolean | undefined;
    default_review_owner?: string | undefined;
    enable_usability_checks?: boolean | undefined;
    enable_accessibility_checks?: boolean | undefined;
    enable_content_checks?: boolean | undefined;
    enable_consistency_checks?: boolean | undefined;
}, {
    review_depth?: "quick" | "standard" | "deep" | undefined;
    review_confidence_threshold?: number | undefined;
    checklist_require_approval?: boolean | undefined;
    show_ai_confidence?: boolean | undefined;
    default_review_owner?: string | undefined;
    enable_usability_checks?: boolean | undefined;
    enable_accessibility_checks?: boolean | undefined;
    enable_content_checks?: boolean | undefined;
    enable_consistency_checks?: boolean | undefined;
}>;
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
export declare const CreateCommentSchema: z.ZodObject<{
    text: z.ZodString;
    authorName: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    text: string;
    authorName: string;
}, {
    text: string;
    authorName?: string | undefined;
}>;
export declare const RegenerateFindingSchema: z.ZodObject<{
    userComments: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    userComments?: string[] | undefined;
}, {
    userComments?: string[] | undefined;
}>;
export type CreateComment = z.infer<typeof CreateCommentSchema>;
export type RegenerateFinding = z.infer<typeof RegenerateFindingSchema>;
