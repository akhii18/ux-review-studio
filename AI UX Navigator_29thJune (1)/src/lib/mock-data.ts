export type Severity = "critical" | "high" | "medium" | "low";
export type Priority = "P0" | "P1" | "P2";
export type ReviewStatus = "draft" | "in_progress" | "completed" | "archived";
export type FindingStatus =
  | "proposed"
  | "accepted"
  | "edited"
  | "dismissed"
  | "escalated"
  | "resolved";

// Map legacy severity to P0/P1/P2
export const severityToPriority: Record<Severity, Priority> = {
  critical: "P0",
  high: "P1",
  medium: "P2",
  low: "P2",
};

export const priorityLabel: Record<Priority, string> = {
  P0: "P0 · Blocker",
  P1: "P1 · Important",
  P2: "P2 · Polish",
};

export interface Review {
  id: string;
  name: string;
  product: string;
  domain: string;
  type: string;
  uxScore: number;
  issues: number;
  critical: number; // legacy
  p0: number;
  p1: number;
  p2: number;
  date: string;
  lastUpdated: string;
  owner: string;
  status: ReviewStatus;
}

export const reviews: Review[] = [
  { id: "r-1024", name: "Onboarding Flow Audit Q4", product: "Digital Banking App", domain: "BFSI", type: "Full UX Review", uxScore: 78, issues: 34, critical: 4, p0: 4, p1: 12, p2: 18, date: "2025-05-22", lastUpdated: "2h ago", owner: "Rakhee Sharma", status: "completed" },
  { id: "r-1023", name: "Claims Submission PRD Alignment", product: "Insurance Claims Portal", domain: "Insurance", type: "PRD Alignment", uxScore: 71, issues: 41, critical: 6, p0: 6, p1: 18, p2: 17, date: "2025-05-21", lastUpdated: "5h ago", owner: "Arjun Mehta", status: "in_progress" },
  { id: "r-1022", name: "Appointment Booking Accessibility", product: "Healthcare Appointment App", domain: "Healthcare", type: "Accessibility Review", uxScore: 82, issues: 22, critical: 2, p0: 2, p1: 8, p2: 12, date: "2025-05-19", lastUpdated: "1d ago", owner: "Priya Kapoor", status: "completed" },
  { id: "r-1021", name: "Checkout Flow v3", product: "Retail Checkout Flow", domain: "Retail", type: "Flow Review", uxScore: 88, issues: 12, critical: 0, p0: 0, p1: 4, p2: 8, date: "2025-05-17", lastUpdated: "3d ago", owner: "Daniel Cho", status: "completed" },
  { id: "r-1020", name: "HR Dashboard Design System", product: "Enterprise HR Dashboard", domain: "Enterprise", type: "Design System Review", uxScore: 74, issues: 28, critical: 3, p0: 3, p1: 10, p2: 15, date: "2025-05-14", lastUpdated: "1w ago", owner: "Meera Iyer", status: "in_progress" },
  { id: "r-1019", name: "Loan Origination Heuristics", product: "Digital Banking App", domain: "BFSI", type: "Heuristic Review", uxScore: 69, issues: 47, critical: 8, p0: 8, p1: 20, p2: 19, date: "2025-05-10", lastUpdated: "2w ago", owner: "Rakhee Sharma", status: "draft" },
];

export interface Finding {
  id: string;
  title: string;
  severity: Severity;
  priority: Priority;
  category: string;
  screen: string;
  principle: string;
  requirement?: string;
  observation: string;
  why: string;
  recommendation: string;
  businessImpact: string;
  a11yImpact?: string;
  status: FindingStatus;
  confidence: number;
}

export const findings: Finding[] = [
  {
    id: "f-1", title: "Primary CTA lacks visual prominence on onboarding screen",
    severity: "critical", priority: "P0", category: "Visual Design", screen: "Onboarding / Step 1",
    principle: "Fitts's Law", requirement: "REQ-OB-04",
    observation: "The 'Continue' CTA uses the secondary button style and sits below the fold on common viewport heights.",
    why: "Users miss the primary action, causing high drop-off and confusion about next steps.",
    recommendation: "Promote CTA to primary indigo variant, raise above the fold, and increase tap target to 48px.",
    businessImpact: "Estimated 12–18% improvement in onboarding completion.",
    status: "proposed", confidence: 92,
  },
  {
    id: "f-2", title: "Form error messages are not descriptive",
    severity: "high", priority: "P1", category: "Error Handling", screen: "Sign Up",
    principle: "Nielsen — Help users recover from errors", requirement: "REQ-AU-12",
    observation: "Validation messages read 'Invalid input' without indicating which field or rule failed.",
    why: "Users cannot self-correct, increasing support load and abandonment.",
    recommendation: "Provide field-specific, actionable error copy and inline guidance with the rule that failed.",
    businessImpact: "Reduces support tickets by ~8% and improves first-time signup success.",
    a11yImpact: "Improves screen reader feedback (WCAG 3.3.1).",
    status: "accepted", confidence: 88,
  },
  {
    id: "f-3", title: "Inconsistent spacing between card sections",
    severity: "medium", priority: "P2", category: "Design System", screen: "Dashboard",
    principle: "Law of Proximity",
    observation: "Card grids alternate between 16px and 24px gutters across the dashboard.",
    why: "Visual rhythm breaks, making the dashboard feel ungoverned.",
    recommendation: "Adopt the 8pt spacing scale; standardize card gutter to 24px.",
    businessImpact: "Improves perceived quality and brand consistency.",
    status: "accepted", confidence: 95,
  },
  {
    id: "f-4", title: "Help text can be simplified for faster comprehension",
    severity: "low", priority: "P2", category: "Content", screen: "Profile Settings",
    principle: "Miller's Law",
    observation: "Help paragraphs exceed 40 words and use jargon ('KYC re-attestation cadence').",
    why: "Cognitive load slows comprehension for first-time users.",
    recommendation: "Rewrite to <20 words in plain language with a 'Learn more' link.",
    businessImpact: "Faster task completion in settings.",
    status: "edited", confidence: 76,
  },
  {
    id: "f-5", title: "Low color contrast on secondary text (2.9:1)",
    severity: "high", priority: "P0", category: "Accessibility", screen: "Account Summary",
    principle: "WCAG 1.4.3 Contrast (Minimum)", requirement: "REQ-A11Y-02",
    observation: "Body secondary text uses #94A3B8 on #F8FAFC, falling below WCAG AA.",
    why: "Excludes users with low vision and reduces legibility in bright environments.",
    recommendation: "Use #475569 (4.6:1) or darker for body secondary text.",
    businessImpact: "Required for enterprise compliance (Section 508).",
    a11yImpact: "Blocks WCAG 2.2 AA conformance.",
    status: "accepted", confidence: 99,
  },
  {
    id: "f-6", title: "Inconsistent button hierarchy across screens",
    severity: "medium", priority: "P1", category: "Design System", screen: "Multiple",
    principle: "Jakob's Law",
    observation: "Three different primary button styles observed across onboarding, dashboard, and settings.",
    why: "Users cannot reliably predict which action is primary.",
    recommendation: "Consolidate to one primary, one secondary, and one ghost variant from the design system.",
    businessImpact: "Improves perceived consistency and reduces cognitive load.",
    status: "proposed", confidence: 84,
  },
  {
    id: "f-7", title: "Multi-step form lacks progress indicator",
    severity: "medium", priority: "P1", category: "Navigation", screen: "Onboarding / Step 2",
    principle: "Nielsen — Visibility of system status",
    observation: "Users see step 2 of 5 with no visible progress affordance.",
    why: "Increases abandonment; users underestimate effort.",
    recommendation: "Add horizontal stepper with current/upcoming labels.",
    businessImpact: "Reduces step-2 drop-off by ~6%.",
    status: "dismissed", confidence: 71,
  },
];

export type PrincipleCategory =
  | "Nielsen heuristics"
  | "Cognitive & interaction laws"
  | "Gestalt principles"
  | "Visual design"
  | "Accessibility"
  | "Content & microcopy";

export interface Principle {
  name: string;
  category: PrincipleCategory;
  definition: string;
  when: string;
  aiFlags: string;
  example: string;
  relatedAreas: string[];
  active: boolean;
  usedIn: number;
}

export const principles: Principle[] = [
  { name: "Jakob's Law", category: "Cognitive & interaction laws", definition: "Users spend most time on other sites, so they expect yours to work the same.", when: "When designing navigation, forms, and primary patterns.", aiFlags: "Custom patterns that deviate from common enterprise conventions.", example: "Custom dropdown that doesn't open on click.", relatedAreas: ["Navigation", "Forms"], active: true, usedIn: 42 },
  { name: "Fitts's Law", category: "Cognitive & interaction laws", definition: "Time to acquire a target is a function of distance and size.", when: "When placing primary CTAs and tap targets.", aiFlags: "Small or distant primary actions; tap targets under 44px.", example: "Tiny 'Submit' link in the corner of a form.", relatedAreas: ["Buttons", "Forms"], active: true, usedIn: 58 },
  { name: "Hick's Law", category: "Cognitive & interaction laws", definition: "Decision time grows with the number and complexity of choices.", when: "For menus, settings, and multi-option screens.", aiFlags: "Overloaded screens; >7 unsorted options.", example: "12 sort options shown at once.", relatedAreas: ["Navigation", "Forms"], active: true, usedIn: 31 },
  { name: "Miller's Law", category: "Cognitive & interaction laws", definition: "People can hold ~7 (±2) items in working memory.", when: "For lists, tables, and forms.", aiFlags: "Long sequences without chunking.", example: "Single 22-field form with no sections.", relatedAreas: ["Forms", "Content"], active: true, usedIn: 27 },
  { name: "Tesler's Law", category: "Cognitive & interaction laws", definition: "Every system has irreducible complexity — designers absorb it.", when: "Reducing user-facing complexity.", aiFlags: "Decisions that could be smart defaults.", example: "Required user to choose tax region on signup.", relatedAreas: ["Forms"], active: true, usedIn: 14 },
  { name: "Doherty Threshold", category: "Cognitive & interaction laws", definition: "Productivity soars when response time stays under 400ms.", when: "Loading and interactive feedback.", aiFlags: "Async actions with no skeleton or progress.", example: "Search results load with a 2s blank state.", relatedAreas: ["Performance", "Feedback"], active: true, usedIn: 19 },
  { name: "Peak-End Rule", category: "Cognitive & interaction laws", definition: "People judge an experience by its peak and its end.", when: "Designing key moments and completion screens.", aiFlags: "Weak end-states (abrupt success screens).", example: "Payment success page is a blank toast.", relatedAreas: ["Success states"], active: true, usedIn: 22 },
  { name: "Goal-Gradient Effect", category: "Cognitive & interaction laws", definition: "Motivation increases as people get closer to completion.", when: "Multi-step flows and onboarding.", aiFlags: "Missing progress indicators in multi-step flows.", example: "Wizard with no step indicator.", relatedAreas: ["Wizard", "Onboarding"], active: true, usedIn: 16 },
  { name: "Von Restorff Effect", category: "Cognitive & interaction laws", definition: "Items that stand out are more memorable.", when: "Highlighting primary actions.", aiFlags: "Primary CTA visually equal to secondary actions.", example: "All buttons styled identically.", relatedAreas: ["Buttons", "Hierarchy"], active: true, usedIn: 24 },
  { name: "Choice Overload", category: "Cognitive & interaction laws", definition: "Too many choices increase cognitive burden and decision delay.", when: "Pricing, settings, plan selection.", aiFlags: "Long unsorted option lists.", example: "12 pricing tiers on one page.", relatedAreas: ["Forms", "Navigation"], active: true, usedIn: 11 },

  { name: "Nielsen — Visibility of system status", category: "Nielsen heuristics", definition: "Keep users informed about what's going on.", when: "Loading, async tasks, multi-step flows.", aiFlags: "Missing progress feedback.", example: "Upload with no progress indicator.", relatedAreas: ["Feedback"], active: true, usedIn: 33 },
  { name: "Nielsen — Match with real world", category: "Nielsen heuristics", definition: "Speak the user's language with familiar concepts.", when: "Microcopy, error messages, navigation labels.", aiFlags: "Jargon and internal terminology.", example: "'KYC re-attestation cadence' shown to end users.", relatedAreas: ["Content"], active: true, usedIn: 18 },
  { name: "Nielsen — User control & freedom", category: "Nielsen heuristics", definition: "Provide clearly marked exits and undo.", when: "Destructive actions, multi-step flows.", aiFlags: "Missing back/undo affordances.", example: "Delete with no undo or confirm.", relatedAreas: ["Forms", "Actions"], active: true, usedIn: 21 },
  { name: "Nielsen — Error prevention", category: "Nielsen heuristics", definition: "Prevent problems before they occur.", when: "Forms, destructive actions, financial flows.", aiFlags: "Destructive actions without confirmation.", example: "Delete account button with no confirm.", relatedAreas: ["Forms"], active: true, usedIn: 26 },
  { name: "Nielsen — Recognition over recall", category: "Nielsen heuristics", definition: "Make options visible instead of relying on memory.", when: "Search, navigation, command surfaces.", aiFlags: "Critical actions hidden behind shortcuts only.", example: "No visible filter; must remember syntax.", relatedAreas: ["Navigation"], active: true, usedIn: 17 },

  { name: "Law of Proximity", category: "Gestalt principles", definition: "Objects near each other are perceived as related.", when: "Grouping related content and controls.", aiFlags: "Inconsistent spacing within groups.", example: "Form label drifts from its input.", relatedAreas: ["Forms", "Layout"], active: true, usedIn: 38 },
  { name: "Law of Similarity", category: "Gestalt principles", definition: "Similar elements are perceived as a group.", when: "Designing repeating components.", aiFlags: "Visually similar items with different behavior.", example: "Two identical buttons doing different things.", relatedAreas: ["Components"], active: true, usedIn: 22 },
  { name: "Law of Common Region", category: "Gestalt principles", definition: "Elements within a shared boundary are perceived as grouped.", when: "Designing cards, sections, and panels.", aiFlags: "Orphaned controls outside their region.", example: "Action button outside the card it acts on.", relatedAreas: ["Cards", "Layout"], active: true, usedIn: 15 },
  { name: "Figure-Ground", category: "Gestalt principles", definition: "Users perceive foreground objects distinctly from background.", when: "Overlays, modals, hero sections.", aiFlags: "Low contrast between modal and background.", example: "Modal without dim overlay.", relatedAreas: ["Modals"], active: true, usedIn: 9 },

  { name: "Visual Hierarchy", category: "Visual design", definition: "Establish order through size, weight, and color.", when: "Every screen.", aiFlags: "Equal weight across all elements.", example: "All headings same size.", relatedAreas: ["Typography"], active: true, usedIn: 47 },
  { name: "8pt Spacing Grid", category: "Visual design", definition: "All spacing values are multiples of 4/8.", when: "Layout and component spacing.", aiFlags: "Off-grid spacing (e.g. 13px, 21px).", example: "Card padding alternates 13/19/27px.", relatedAreas: ["Layout"], active: true, usedIn: 31 },
  { name: "Whitespace & Breathing Room", category: "Visual design", definition: "Whitespace clarifies relationships and reduces cognitive load.", when: "Dense interfaces.", aiFlags: "Cramped layouts with no margin.", example: "Tables with 4px row padding.", relatedAreas: ["Layout"], active: true, usedIn: 19 },

  { name: "WCAG 1.4.3 — Contrast (AA)", category: "Accessibility", definition: "Text contrast ≥ 4.5:1 (normal) or 3:1 (large).", when: "All text and UI components.", aiFlags: "Text below contrast threshold.", example: "Gray text #94A3B8 on white = 2.9:1.", relatedAreas: ["Accessibility"], active: true, usedIn: 52 },
  { name: "WCAG 2.1.1 — Keyboard", category: "Accessibility", definition: "All functionality available via keyboard.", when: "Custom widgets and interactive elements.", aiFlags: "Mouse-only interactions.", example: "Custom slider with no keyboard support.", relatedAreas: ["Accessibility"], active: true, usedIn: 28 },
  { name: "WCAG 2.4.7 — Focus Visible", category: "Accessibility", definition: "Visible focus indicator on all interactive elements.", when: "Buttons, links, inputs.", aiFlags: "Removed outlines without replacement.", example: "Default outline removed with no ring.", relatedAreas: ["Accessibility"], active: true, usedIn: 35 },

  { name: "Clarity over Cleverness", category: "Content & microcopy", definition: "Plain, direct language beats clever phrasing.", when: "Labels, buttons, errors.", aiFlags: "Ambiguous CTAs ('Submit', 'OK').", example: "'OK' on a destructive action.", relatedAreas: ["Content"], active: true, usedIn: 24 },
  { name: "Action-Oriented Labels", category: "Content & microcopy", definition: "Button labels describe what happens next.", when: "All CTAs.", aiFlags: "Generic verbs ('Click here', 'Submit').", example: "'Submit' instead of 'Send report'.", relatedAreas: ["Buttons"], active: true, usedIn: 20 },
];

export type RuleCategory = "Buttons" | "Typography" | "Cards" | "Forms" | "Icons" | "Spacing" | "Tables" | "Modals";

export interface DesignSystemRule {
  id: string;
  name: string;
  category: RuleCategory;
  description: string;
  priority: Priority;
  severity: Severity;
  status: "active" | "draft" | "deprecated";
  owner: string;
  updated: string;
  doc?: string;
  pass: string;
  fail: string;
}

export const designSystemRules: DesignSystemRule[] = [
  { id: "ds-1", name: "Primary button uses indigo-700", category: "Buttons", description: "All primary CTAs must use #1E3A8A with white text.", priority: "P1", severity: "high", status: "active", owner: "Design System Team", updated: "2025-04-12", doc: "/docs/buttons", pass: "Primary button with #1E3A8A bg, white text.", fail: "Primary button in arbitrary blue or with low-contrast text." },
  { id: "ds-2", name: "Body text contrast ≥ 4.5:1", category: "Typography", description: "Body text must meet WCAG AA contrast against background.", priority: "P0", severity: "critical", status: "active", owner: "Accessibility Guild", updated: "2025-04-10", doc: "/docs/typography", pass: "#475569 text on white = 7.5:1.", fail: "#94A3B8 text on white = 2.9:1." },
  { id: "ds-3", name: "Card radius is 12px", category: "Cards", description: "All cards use --radius-lg (12px) for consistency.", priority: "P2", severity: "low", status: "active", owner: "Design System Team", updated: "2025-03-28", pass: "Cards with rounded-xl (12px).", fail: "Cards with mixed 4px, 8px, 16px radii." },
  { id: "ds-4", name: "Inputs use 40px minimum height", category: "Forms", description: "Inputs must be 40px tall for comfortable touch targets.", priority: "P1", severity: "medium", status: "active", owner: "Design System Team", updated: "2025-03-22", pass: "h-10 inputs.", fail: "h-7 inputs on touch devices." },
  { id: "ds-5", name: "Icons sized at 16/20/24", category: "Icons", description: "Use one of the three approved icon sizes only.", priority: "P2", severity: "low", status: "active", owner: "Design System Team", updated: "2025-03-15", pass: "Icons at 16px in dense rows.", fail: "Icon at 13px or 22px." },
  { id: "ds-6", name: "Spacing follows 8pt grid", category: "Spacing", description: "All spacing values must be multiples of 4 (preferably 8).", priority: "P1", severity: "medium", status: "active", owner: "Design System Team", updated: "2025-03-10", pass: "p-4, p-6, p-8.", fail: "p-[13px], p-[21px]." },
  { id: "ds-7", name: "Tables use zebra striping for >10 rows", category: "Tables", description: "Tables with more than 10 rows must alternate row backgrounds.", priority: "P2", severity: "low", status: "active", owner: "Design System Team", updated: "2025-03-04", pass: "Striped rows in long tables.", fail: "Flat 30-row table." },
  { id: "ds-8", name: "Modals max-width 560px", category: "Modals", description: "Modal dialogs must not exceed 560px width.", priority: "P1", severity: "medium", status: "active", owner: "Design System Team", updated: "2025-02-26", pass: "Modal at 560px max.", fail: "Modal at 900px on desktop." },
  { id: "ds-9", name: "Primary CTA per view", category: "Buttons", description: "Only one primary action visible at a time.", priority: "P1", severity: "medium", status: "active", owner: "Design System Team", updated: "2025-02-14", pass: "One primary, multiple secondary.", fail: "Three primary buttons in one card." },
  { id: "ds-10", name: "Form fields have visible labels", category: "Forms", description: "Placeholder is never a substitute for a label.", priority: "P0", severity: "critical", status: "active", owner: "Accessibility Guild", updated: "2025-02-02", pass: "<label> above input.", fail: "Placeholder-only inputs." },
];

export type A11yLevel = "A" | "AA" | "AAA";
export type A11yTestType = "Automated" | "Manual" | "AI-assisted";

export interface A11yCheck {
  id: string;
  title: string;
  wcag: string;
  level: A11yLevel;
  priority: Priority;
  severity: Severity;
  category: string;
  description: string;
  example: string;
  fix: string;
  enabled: boolean;
  testType: A11yTestType;
  relatedPrinciples: string[];
}

export const a11yChecks: A11yCheck[] = [
  { id: "a11y-1", title: "Color contrast ≥ 4.5:1 for body text", wcag: "1.4.3", level: "AA", priority: "P0", severity: "critical", category: "Color contrast", description: "Body text contrast against background.", example: "#94A3B8 text on white = 2.9:1 (fail)", fix: "Use #475569 or darker.", enabled: true, testType: "Automated", relatedPrinciples: ["WCAG 1.4.3 — Contrast (AA)"] },
  { id: "a11y-2", title: "All interactive elements reachable by keyboard", wcag: "2.1.1", level: "A", priority: "P0", severity: "critical", category: "Keyboard navigation", description: "Every action must be operable via keyboard.", example: "Custom dropdown only opens on click.", fix: "Add Enter/Space handlers and focus management.", enabled: true, testType: "Manual", relatedPrinciples: ["WCAG 2.1.1 — Keyboard"] },
  { id: "a11y-3", title: "Visible focus indicator", wcag: "2.4.7", level: "AA", priority: "P1", severity: "high", category: "Focus state", description: "Focus state must be clearly visible.", example: "Default outline removed without replacement.", fix: "Provide a 2px focus ring with 3:1 contrast.", enabled: true, testType: "Automated", relatedPrinciples: ["WCAG 2.4.7 — Focus Visible"] },
  { id: "a11y-4", title: "Form fields have associated labels", wcag: "3.3.2", level: "A", priority: "P0", severity: "critical", category: "Form labels", description: "Every input has a programmatic label.", example: "Placeholder used as label only.", fix: "Add <label htmlFor> or aria-label.", enabled: true, testType: "AI-assisted", relatedPrinciples: ["Nielsen — Recognition over recall"] },
  { id: "a11y-5", title: "Touch targets ≥ 44×44px", wcag: "2.5.5", level: "AAA", priority: "P1", severity: "medium", category: "Touch targets", description: "Tap targets on touch devices.", example: "Icon button is 24×24px.", fix: "Increase to 44×44 or add padding.", enabled: true, testType: "Automated", relatedPrinciples: ["Fitts's Law"] },
  { id: "a11y-6", title: "Images have meaningful alt text", wcag: "1.1.1", level: "A", priority: "P1", severity: "high", category: "Alternative text", description: "Non-decorative images need alt.", example: "Hero image with empty alt.", fix: "Describe the image's content/function.", enabled: true, testType: "AI-assisted", relatedPrinciples: [] },
  { id: "a11y-7", title: "Headings follow a logical hierarchy", wcag: "1.3.1", level: "A", priority: "P1", severity: "medium", category: "Heading structure", description: "No skipped heading levels.", example: "h1 followed by h4.", fix: "Use sequential heading levels.", enabled: true, testType: "Automated", relatedPrinciples: [] },
  { id: "a11y-8", title: "Errors identified in text, not just color", wcag: "1.4.1", level: "A", priority: "P1", severity: "high", category: "Error identification", description: "Don't rely on color alone.", example: "Red border with no icon or text.", fix: "Add icon and explicit message.", enabled: true, testType: "AI-assisted", relatedPrinciples: [] },
  { id: "a11y-9", title: "Captions / transcripts for media", wcag: "1.2.2", level: "A", priority: "P1", severity: "high", category: "Media", description: "Pre-recorded media has captions.", example: "Video tutorial without captions.", fix: "Add closed captions and transcript.", enabled: true, testType: "Manual", relatedPrinciples: [] },
  { id: "a11y-10", title: "ARIA only where needed", wcag: "4.1.2", level: "A", priority: "P2", severity: "medium", category: "ARIA", description: "No redundant or incorrect ARIA on semantic elements.", example: "role='button' on a native <button>.", fix: "Use semantic HTML first; remove redundant ARIA.", enabled: true, testType: "AI-assisted", relatedPrinciples: [] },
  { id: "a11y-11", title: "Screen reader interpretation is meaningful", wcag: "4.1.2", level: "A", priority: "P0", severity: "critical", category: "Screen reader", description: "Interactive elements have accessible names.", example: "Icon-only button with no aria-label.", fix: "Add aria-label or visible text.", enabled: true, testType: "Manual", relatedPrinciples: [] },
];

export interface Prompt {
  id: string;
  name: string;
  category: string;
  description: string;
  lastUsed: string;
  owner: string;
  rating: number;
  tags: string[];
  version: string;
  approved: boolean;
  approvedBy: string;
  checklistVersion: string;
  riskLevel: "low" | "medium" | "high";
  usedCount: number;
}

export const prompts: Prompt[] = [
  { id: "p-1", name: "Full UX Review — SaaS Dashboard", category: "Full UX Review", description: "Comprehensive heuristic and design-system review for B2B dashboards.", lastUsed: "2025-05-22", owner: "Rakhee Sharma", rating: 4.8, tags: ["dashboard", "saas", "full review"], version: "v3.2", approved: true, approvedBy: "Design Council", checklistVersion: "UXM-2025.5", riskLevel: "low", usedCount: 142 },
  { id: "p-2", name: "PRD Alignment — Banking Onboarding", category: "PRD Alignment", description: "Trace each requirement to design coverage with evidence.", lastUsed: "2025-05-20", owner: "Arjun Mehta", rating: 4.6, tags: ["BFSI", "PRD", "onboarding"], version: "v2.1", approved: true, approvedBy: "Compliance Lead", checklistVersion: "UXM-2025.5", riskLevel: "medium", usedCount: 78 },
  { id: "p-3", name: "WCAG 2.2 AA Audit", category: "Accessibility Review", description: "Section 508 / WCAG 2.2 AA audit across uploaded screens.", lastUsed: "2025-05-19", owner: "Priya Kapoor", rating: 4.9, tags: ["a11y", "WCAG"], version: "v4.0", approved: true, approvedBy: "Accessibility Guild", checklistVersion: "WCAG-2.2", riskLevel: "high", usedCount: 211 },
  { id: "p-4", name: "Checkout Flow Review", category: "Full UX Review", description: "Conversion-focused heuristic review for retail checkout.", lastUsed: "2025-05-17", owner: "Daniel Cho", rating: 4.7, tags: ["retail", "conversion"], version: "v1.8", approved: true, approvedBy: "Design Council", checklistVersion: "UXM-2025.5", riskLevel: "low", usedCount: 64 },
  { id: "p-5", name: "Healthcare Appointment Flow", category: "Domain-specific", description: "HIPAA-aware UX review for patient-facing flows.", lastUsed: "2025-05-15", owner: "Priya Kapoor", rating: 4.5, tags: ["healthcare", "HIPAA"], version: "v1.2", approved: true, approvedBy: "Domain Lead", checklistVersion: "UXM-2025.5", riskLevel: "high", usedCount: 38 },
  { id: "p-6", name: "Form Microcopy Review", category: "Content Review", description: "Reviews labels, helpers, and error copy for clarity.", lastUsed: "2025-05-12", owner: "Meera Iyer", rating: 4.4, tags: ["content", "forms"], version: "v2.0", approved: false, approvedBy: "—", checklistVersion: "UXM-2025.5", riskLevel: "low", usedCount: 27 },
  { id: "p-7", name: "Design System Compliance", category: "Design System Review", description: "Checks adherence to component, spacing, and color tokens.", lastUsed: "2025-05-11", owner: "Meera Iyer", rating: 4.6, tags: ["design system"], version: "v2.4", approved: true, approvedBy: "Design System Team", checklistVersion: "DS-2025.4", riskLevel: "medium", usedCount: 89 },
];

export const reports = [
  { id: "rep-1", name: "Onboarding Flow Audit Q4 — Executive Report", project: "Digital Banking App", template: "Executive Summary", created: "2025-05-22", by: "Rakhee Sharma", status: "Final" },
  { id: "rep-2", name: "Claims Portal PRD Alignment", project: "Insurance Claims Portal", template: "PRD Alignment Report", created: "2025-05-21", by: "Arjun Mehta", status: "Draft" },
  { id: "rep-3", name: "Appointment Booking Accessibility", project: "Healthcare Appointment App", template: "Accessibility Audit", created: "2025-05-19", by: "Priya Kapoor", status: "Final" },
  { id: "rep-4", name: "Checkout v3 Designer Fix Report", project: "Retail Checkout Flow", template: "Designer Fix Report", created: "2025-05-17", by: "Daniel Cho", status: "Final" },
  { id: "rep-5", name: "HR Dashboard DS Compliance", project: "Enterprise HR Dashboard", template: "Design System Compliance", created: "2025-05-14", by: "Meera Iyer", status: "In Review" },
];

export const reportTemplates = [
  { id: "exec", name: "Executive Summary", audience: "Leadership / stakeholders", description: "High-level UX score, P0 risks, and business impact for leadership review.", sections: 6 },
  { id: "fix", name: "Designer Fix Report", audience: "Designers / engineers", description: "Action-ready findings with recommendations, screens, and acceptance criteria.", sections: 9 },
  { id: "a11y", name: "Accessibility Audit", audience: "Accessibility / QA", description: "WCAG 2.2 conformance report with violations, levels, and remediation guidance.", sections: 8 },
  { id: "ds", name: "Design System Compliance", audience: "Design system team", description: "Token, component, and pattern adherence with violation evidence.", sections: 7 },
  { id: "prd", name: "PRD Alignment Report", audience: "Product managers", description: "Requirement-by-requirement coverage with gap analysis.", sections: 7 },
];

export const requirements = [
  { id: "REQ-OB-01", desc: "User can sign up with email or SSO", coverage: "Yes", evidence: "Onboarding / Step 1", gap: "—", priority: "P2" as Priority, recommendation: "—" },
  { id: "REQ-OB-02", desc: "Multi-factor authentication during signup", coverage: "Partial", evidence: "Onboarding / Step 3", gap: "SMS option missing", priority: "P1" as Priority, recommendation: "Add SMS fallback for MFA." },
  { id: "REQ-OB-03", desc: "User can resume onboarding later", coverage: "No", evidence: "—", gap: "No save-and-resume", priority: "P0" as Priority, recommendation: "Add resume token + email link." },
  { id: "REQ-OB-04", desc: "Primary CTA is prominent on each step", coverage: "Partial", evidence: "Step 1, Step 2", gap: "Step 1 CTA is secondary", priority: "P1" as Priority, recommendation: "Promote to primary style." },
  { id: "REQ-OB-05", desc: "Clear error states for KYC mismatch", coverage: "Yes", evidence: "Step 4 / Errors", gap: "—", priority: "P2" as Priority, recommendation: "—" },
  { id: "REQ-OB-06", desc: "Accessibility WCAG 2.2 AA", coverage: "Partial", evidence: "Various", gap: "Contrast failures on summary", priority: "P1" as Priority, recommendation: "Update secondary text token." },
  { id: "REQ-OB-07", desc: "Localized to en-IN, en-US, hi-IN", coverage: "Yes", evidence: "i18n bundle", gap: "—", priority: "P2" as Priority, recommendation: "—" },
];

export const needsAttention = {
  untriagedP0: 7,
  awaitingApproval: 3,
  a11yBlockers: 5,
  failedExports: 1,
};

export const recurringIssues = [
  { title: "Inconsistent button hierarchy across products", principle: "Jakob's Law", count: 38 },
  { title: "Missing error states on forms", principle: "Nielsen — Error prevention", count: 31 },
  { title: "Low contrast text (WCAG 1.4.3)", principle: "WCAG 1.4.3 — Contrast", count: 27 },
  { title: "CTAs below the fold on key flows", principle: "Fitts's Law", count: 22 },
  { title: "Touch targets under 44px", principle: "Fitts's Law", count: 19 },
];

export const criteriaGroups = [
  { group: "Usability", items: ["Nielsen's 10 heuristics", "Navigation logic", "Task flow efficiency", "Recognition over recall"] },
  { group: "Accessibility", items: ["WCAG 2.2 AA conformance", "Keyboard navigation", "Screen reader interpretation", "Touch targets ≥ 44px"] },
  { group: "Consistency", items: ["Design system tokens", "Component usage", "Spacing 8pt grid", "Iconography consistency"] },
  { group: "Content UX", items: ["Microcopy clarity", "Error message quality", "Label precision", "Tone & voice"] },
  { group: "Risk", items: ["Compliance (Section 508)", "Domain regulation (HIPAA, BFSI)", "Destructive action safety", "Data privacy disclosures"] },
  { group: "Recommendations", items: ["Business impact estimate", "Effort estimate", "Acceptance criteria", "Linked principle"] },
];
