export type ReviewArea = "USABILITY" | "ACCESSIBILITY" | "CONSISTENCY" | "CONTENT_UX" | "RISK" | "RECOMMENDATIONS";
export type Severity = "P0" | "P1" | "P2";
export type FindingStatus = "PROPOSED" | "ACCEPTED" | "EDITED" | "DISMISSED" | "ESCALATED";
export type ChecklistStatus = "DRAFT" | "APPROVED" | "DEPRECATED";
export type PrincipleCategory = "NIELSEN_HEURISTICS" | "COGNITIVE_LAWS" | "GESTALT" | "VISUAL_DESIGN" | "ACCESSIBILITY_WCAG" | "CONTENT_MICROCOPY" | "CUSTOM";
export type ReviewStatus = "draft" | "in_progress" | "completed" | "failed" | "archived";
export type AnalysisScope = "all" | "key";
export type FindingOutputOptionKey = "recommendationsWithAcceptanceCriteria" | "linkedPrinciple" | "requirementTraceability" | "accessibilityImpactWcag" | "businessImpactEstimate";
export interface FindingAiMetadata {
    acceptanceCriteria?: string[];
    requirementTraceability?: string;
    wcagCriteria?: string;
    flowName?: string;
    flowDescription?: string;
    flowPageNumbers?: number[];
    escalationRecipients?: Array<{ label: string; email?: string }>;
}
export interface Finding {
    id: string;
    reviewId: string;
    title: string;
    description: string;
    recommendation: string;
    severity: Severity;
    area: ReviewArea;
    screen?: string;
    principle?: string;
    observation?: string;
    why?: string;
    businessImpact?: string;
    a11yImpact?: string;
    aiMetadata?: FindingAiMetadata | null;
    status: FindingStatus;
    confidence: number;
    notes?: string;
    escalationReason?: string;
    isAiGenerated: boolean;
    bboxRefs?: Array<{ screenIndex: number; bbox: { x: number; y: number; width: number; height: number } }>;
    createdAt: string;
    updatedAt: string;
}
export interface ReviewBasisItem {
    id: string;
    findingId: string;
    type: string;
    name: string;
    explanation: string;
}
export interface FindingWithBasis extends Finding {
    reviewBasis: ReviewBasisItem[];
}
export interface DiscoveredFlow {
    flowName: string;
    description: string;
    pageNumbers: number[];
}
export interface FlowDiscoveryPayload {
    flows: DiscoveredFlow[];
    routingRationale?: string;
}
export interface FindingFlowGroup<TFinding = FindingWithBasis> {
    flowName: string;
    description?: string;
    pageNumbers: number[];
    findings: TFinding[];
}
export interface Checklist {
    id: string;
    title: string;
    description?: string;
    status: ChecklistStatus;
    version: number;
    approvedAt?: string;
    approvedBy?: string;
    createdAt: string;
    updatedAt: string;
    items: ChecklistItem[];
}
export interface ChecklistItem {
    id: string;
    checklistId: string;
    label: string;
    description?: string;
    principleId?: string;
    area?: ReviewArea;
    required: boolean;
    order: number;
}
export interface UxPrinciple {
    id: string;
    name: string;
    description: string;
    category: PrincipleCategory;
    source?: string;
    enabled: boolean;
    isCustom: boolean;
    createdAt: string;
    updatedAt: string;
}
export interface Setting {
    id: string;
    key: string;
    value: unknown;
    updatedAt: string;
}
export interface Review {
    id: string;
    name: string;
    product: string;
    domain: string;
    reviewType: string;
    owner: string;
    status: ReviewStatus;
    stage?: string;
    uxScore?: number;
    criteria: string[];
    findingMetadataOptions?: FindingOutputOptionKey[];
    analysisScope: AnalysisScope;
    flowDiscovery?: FlowDiscoveryPayload | null;
    findingGroups?: FindingFlowGroup[];
    depth: string;
    confidenceThreshold: number;
    createdAt: string;
    updatedAt: string;
}
export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}
export interface ApiSuccess<T> {
    success: true;
    data: T;
}
export interface ApiError {
    success: false;
    error: string;
    details?: unknown;
}
export type ApiResponse<T> = ApiSuccess<T> | ApiError;
