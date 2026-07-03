"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_SETTINGS = exports.REVIEW_BASIS_LIBRARY = exports.PRINCIPLE_CATEGORY_LABELS = exports.DEFAULT_FINDING_OUTPUT_OPTIONS = exports.FINDING_OUTPUT_OPTIONS = exports.REVIEW_AREA_LABELS = exports.REVIEW_AREAS = exports.SEVERITY_LABELS = void 0;
// ── Severity / Priority labels ────────────────────────────────────────────────
exports.SEVERITY_LABELS = {
    P0: "P0 · Blocker",
    P1: "P1 · Important",
    P2: "P2 · Polish",
};
// ── Review areas ──────────────────────────────────────────────────────────────
exports.REVIEW_AREAS = [
    "USABILITY",
    "ACCESSIBILITY",
    "CONSISTENCY",
    "CONTENT_UX",
    "RISK",
    "RECOMMENDATIONS",
];
exports.REVIEW_AREA_LABELS = {
    USABILITY: "Usability",
    ACCESSIBILITY: "Accessibility",
    CONSISTENCY: "Consistency",
    CONTENT_UX: "Content & UX",
    RISK: "Risk",
    RECOMMENDATIONS: "Recommendations",
};
exports.FINDING_OUTPUT_OPTIONS = [
    { key: "recommendationsWithAcceptanceCriteria", label: "Recommendations with acceptance criteria" },
    { key: "linkedPrinciple", label: "Linked principle for each finding" },
    { key: "requirementTraceability", label: "Requirement traceability" },
    { key: "accessibilityImpactWcag", label: "Accessibility impact (WCAG)" },
    { key: "businessImpactEstimate", label: "Business impact estimate" },
];
exports.DEFAULT_FINDING_OUTPUT_OPTIONS = exports.FINDING_OUTPUT_OPTIONS.map((option) => option.key);
// ── Principle categories ──────────────────────────────────────────────────────
exports.PRINCIPLE_CATEGORY_LABELS = {
    NIELSEN_HEURISTICS: "Nielsen Heuristics",
    COGNITIVE_LAWS: "Cognitive Laws",
    GESTALT: "Gestalt Principles",
    VISUAL_DESIGN: "Visual Design",
    ACCESSIBILITY_WCAG: "Accessibility (WCAG)",
    CONTENT_MICROCOPY: "Content & Microcopy",
    CUSTOM: "Custom",
};
exports.REVIEW_BASIS_LIBRARY = [
    // Nielsen Heuristics
    {
        name: "Nielsen — Visibility of system status",
        type: "Usability Heuristic",
        explanation: "Keep users informed about what is going on.",
        category: "NIELSEN_HEURISTICS",
    },
    {
        name: "Nielsen — Match with real world",
        type: "Usability Heuristic",
        explanation: "Speak the user's language with familiar concepts.",
        category: "NIELSEN_HEURISTICS",
    },
    {
        name: "Nielsen — User control & freedom",
        type: "Usability Heuristic",
        explanation: "Provide clearly marked exits and undo.",
        category: "NIELSEN_HEURISTICS",
    },
    {
        name: "Nielsen — Consistency & standards",
        type: "Usability Heuristic",
        explanation: "Follow platform conventions.",
        category: "NIELSEN_HEURISTICS",
    },
    {
        name: "Nielsen — Error prevention",
        type: "Usability Heuristic",
        explanation: "Prevent problems before they occur.",
        category: "NIELSEN_HEURISTICS",
    },
    {
        name: "Nielsen — Recognition over recall",
        type: "Usability Heuristic",
        explanation: "Make options visible instead of relying on memory.",
        category: "NIELSEN_HEURISTICS",
    },
    {
        name: "Nielsen — Flexibility & efficiency of use",
        type: "Usability Heuristic",
        explanation: "Accelerators speed up interaction for experts.",
        category: "NIELSEN_HEURISTICS",
    },
    {
        name: "Nielsen — Aesthetic & minimalist design",
        type: "Usability Heuristic",
        explanation: "Every extra element competes with the relevant.",
        category: "NIELSEN_HEURISTICS",
    },
    {
        name: "Nielsen — Help users recognise, diagnose, recover from errors",
        type: "Usability Heuristic",
        explanation: "Error messages should be plain-language and constructive.",
        category: "NIELSEN_HEURISTICS",
    },
    {
        name: "Nielsen — Help & documentation",
        type: "Usability Heuristic",
        explanation: "Even if the system can be used without docs, help should exist.",
        category: "NIELSEN_HEURISTICS",
    },
    // Cognitive Laws
    {
        name: "Fitts's Law",
        type: "Cognitive Law",
        explanation: "Time to acquire a target is a function of distance and size.",
        category: "COGNITIVE_LAWS",
    },
    {
        name: "Hick's Law",
        type: "Cognitive Law",
        explanation: "Decision time grows with the number and complexity of choices.",
        category: "COGNITIVE_LAWS",
    },
    {
        name: "Miller's Law",
        type: "Cognitive Law",
        explanation: "People can hold ~7 (±2) items in working memory.",
        category: "COGNITIVE_LAWS",
    },
    {
        name: "Jakob's Law",
        type: "Cognitive Law",
        explanation: "Users expect your site to work the same as others they know.",
        category: "COGNITIVE_LAWS",
    },
    // Gestalt
    {
        name: "Law of Proximity",
        type: "Gestalt Principle",
        explanation: "Objects near each other are perceived as related.",
        category: "GESTALT",
    },
    {
        name: "Law of Similarity",
        type: "Gestalt Principle",
        explanation: "Similar elements are perceived as a group.",
        category: "GESTALT",
    },
    {
        name: "Law of Continuity",
        type: "Gestalt Principle",
        explanation: "Elements arranged on a line or curve are perceived as related.",
        category: "GESTALT",
    },
    // Accessibility
    {
        name: "WCAG 1.4.3 — Contrast (AA)",
        type: "Accessibility Standard",
        explanation: "Text contrast ≥ 4.5:1 for normal text.",
        category: "ACCESSIBILITY_WCAG",
    },
    {
        name: "WCAG 2.1.1 — Keyboard",
        type: "Accessibility Standard",
        explanation: "All functionality available via keyboard.",
        category: "ACCESSIBILITY_WCAG",
    },
    {
        name: "WCAG 2.4.7 — Focus Visible",
        type: "Accessibility Standard",
        explanation: "Visible focus indicator on all interactive elements.",
        category: "ACCESSIBILITY_WCAG",
    },
    {
        name: "WCAG 1.1.1 — Non-text Content",
        type: "Accessibility Standard",
        explanation: "All non-text content has a text alternative.",
        category: "ACCESSIBILITY_WCAG",
    },
    // Visual Design
    {
        name: "Visual Hierarchy",
        type: "Visual Design",
        explanation: "Establish order through size, weight, and color.",
        category: "VISUAL_DESIGN",
    },
    {
        name: "8pt Spacing Grid",
        type: "Visual Design",
        explanation: "All spacing values are multiples of 4/8.",
        category: "VISUAL_DESIGN",
    },
    // Content
    {
        name: "Clarity over Cleverness",
        type: "Content Principle",
        explanation: "Plain, direct language beats clever phrasing.",
        category: "CONTENT_MICROCOPY",
    },
    {
        name: "Action-oriented labels",
        type: "Content Principle",
        explanation: "Buttons should start with a verb.",
        category: "CONTENT_MICROCOPY",
    },
];
// ── Default settings ──────────────────────────────────────────────────────────
exports.DEFAULT_SETTINGS = {
    review_depth: "standard",
    review_confidence_threshold: 75,
    checklist_require_approval: true,
    show_ai_confidence: true,
    default_review_owner: "Rakhee Sharma",
    enable_usability_checks: true,
    enable_accessibility_checks: true,
    enable_content_checks: true,
    enable_consistency_checks: true,
};
