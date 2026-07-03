import type { FindingOutputOptionKey, PrincipleCategory, ReviewArea } from "../types";
export declare const SEVERITY_LABELS: Record<string, string>;
export declare const REVIEW_AREAS: ReviewArea[];
export declare const REVIEW_AREA_LABELS: Record<ReviewArea, string>;
export declare const FINDING_OUTPUT_OPTIONS: Array<{
    key: FindingOutputOptionKey;
    label: string;
}>;
export declare const DEFAULT_FINDING_OUTPUT_OPTIONS: FindingOutputOptionKey[];
export declare const PRINCIPLE_CATEGORY_LABELS: Record<PrincipleCategory, string>;
export interface ReviewBasisSeed {
    name: string;
    type: string;
    explanation: string;
    category: PrincipleCategory;
}
export declare const REVIEW_BASIS_LIBRARY: ReviewBasisSeed[];
export declare const DEFAULT_SETTINGS: {
    review_depth: string;
    review_confidence_threshold: number;
    checklist_require_approval: boolean;
    show_ai_confidence: boolean;
    default_review_owner: string;
    enable_usability_checks: boolean;
    enable_accessibility_checks: boolean;
    enable_content_checks: boolean;
    enable_consistency_checks: boolean;
};
