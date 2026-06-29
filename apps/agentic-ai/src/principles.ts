/**
 * principles.ts
 * --------------
 *
 * This string is injected directly into the usability agent's system prompt.
 * No RAG needed — ~1,500 tokens, fits easily in any modern LLM context window.
 *
 * Source: UXM Co-Pilot PRD v1.0, Appendix A.1 + A.2
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * STRUCTURE
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * SECTION 1 — Original 6 principle family exports (unchanged, backward-compatible)
 * SECTION 2 — New subcategory principle exports (18 new blocks)
 * SECTION 3 — Original family-level keys, types, and maps (unchanged)
 * SECTION 4 — New subcategory-level keys, types, and maps
 *
 * When a user selects a subcategory (e.g. "Navigation logic"), inject the
 * corresponding block from SUBCATEGORY_PROMPTS into the agent's system prompt.
 * Subcategories that were already covered by original families point to those
 * existing exports — no duplicate content is introduced.
 */

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 1 — ORIGINAL PRINCIPLE FAMILY EXPORTS (UNCHANGED)
// ─────────────────────────────────────────────────────────────────────────────

export const NIELSEN_PRINCIPLES = `
=== NIELSEN'S 10 USABILITY HEURISTICS ===
You must only flag findings that violate one of these named principles.
If a finding cannot be traced to a principle below, do not include it.

1. Visibility of System Status
   Meaning: Always keep users informed about what is happening via timely feedback.
   Flag when: Loading/progress/saved-state feedback is missing on any async action.
   Severity guide: P0 if user can't tell if their action worked; P1 if just slow/unclear.

2. Match Between System and the Real World
   Meaning: Speak the user's language. Follow real-world conventions and natural ordering.
   Flag when: System jargon, technical terms, or unnatural orderings appear.
   Severity guide: P1 if confusing to a typical user; P2 if minor phrasing issue.

3. User Control and Freedom
   Meaning: Users make mistakes. Provide clearly marked emergency exits, undo, and redo.
   Flag when: Destructive actions have no undo; flows have no cancel or back option.
   Severity guide: P0 if data loss possible; P1 if user is stuck without exit.

4. Consistency and Standards
   Meaning: Same thing = same word, same look, same behaviour. Follow platform norms.
   Flag when: The same action or concept uses inconsistent labels, icons, or patterns.
   Severity guide: P1 if likely to confuse; P2 if minor visual inconsistency.

5. Error Prevention
   Meaning: Better to prevent problems than to show good error messages.
   Flag when: Easy-to-make mistakes have no guard (confirmation, constraint, warning).
   Severity guide: P0 for irreversible destructive actions; P1 for recoverable mistakes.

6. Recognition Over Recall
   Meaning: Minimize memory load. Make options and actions visible.
   Flag when: Users must remember information across screens to complete a task.
   Severity guide: P1 if it significantly slows task completion; P2 if minor.

7. Flexibility and Efficiency of Use
   Meaning: Accelerators for experts; let users tailor frequent actions.
   Flag when: No shortcuts, bulk actions, or faster paths exist for experienced users.
   Severity guide: P2 usually, unless the audience is power users.

8. Aesthetic and Minimalist Design
   Meaning: No irrelevant or rarely-needed information should compete for attention.
   Flag when: Visual clutter, competing CTAs, or low signal-to-noise ratio appears.
   Severity guide: P1 if it hides primary actions; P2 if just noisy.

9. Help Users Recognize, Diagnose, and Recover From Errors
   Meaning: Error messages in plain language, stating the problem and a solution.
   Flag when: Cryptic error codes appear; errors offer no recovery path.
   Severity guide: P0 if user is completely blocked; P1 if confusing but workable.

10. Help and Documentation
    Meaning: Provide easy-to-search, task-focused help where needed.
    Flag when: Complex flows have no inline guidance, tooltip, or help affordance.
    Severity guide: P2 usually, unless the flow is genuinely impossible without help.
`;

export const POUR_PRINCIPLES = `
=== WCAG POUR ACCESSIBILITY PRINCIPLES ===
You must only flag findings that violate one of these four named principles.
If a finding cannot be traced to a principle below, do not include it.

1. Perceivable
   Meaning: Information must be presentable in ways all users can perceive.
   Flag when: Low contrast, missing alt text, no captions, color used as the only
              means of conveying information.
   Severity guide: P0 if a user group cannot access the content at all;
                   P1 if it is degraded; P2 if minor.

2. Operable
   Meaning: Interface components must be operable by any input method.
   Flag when: Keyboard traps exist, no visible focus indicator, missing focus
              management after interactions, tap/click targets are too small
              (< 44×44 px by WCAG 2.5.5).
   Severity guide: P0 if an element cannot be reached by keyboard or pointer;
                   P1 if reachable but difficult.

3. Understandable
   Meaning: Content and operation must be readable and predictable.
   Flag when: Unlabelled form fields, inconsistent navigation, unclear error
              identification, content that changes context without user initiation.
   Severity guide: P1 if confusing to a typical user; P2 if minor phrasing issue.

4. Robust
   Meaning: Content must work reliably with assistive technologies.
   Flag when: Non-semantic markup visible in visual design signals
              (e.g. decorative icons with no discernible label, controls that
              look like buttons but have no apparent role), anything a screen
              reader likely cannot interpret.
   Severity guide: P1 for controls that appear inaccessible; P2 for marginal cases.
`;

export const COGNITIVE_LAWS = `
=== COGNITIVE INTERACTION LAWS ===
You must only flag findings that violate one of these named principles.
If a finding cannot be traced to a principle below, do not include it.

1. Jakob's Law
   Meaning: Users expect your product to work like the others they already know.
   Flag when: Unconventional patterns that break learned expectations.
   Area: Consistency · Usability

2. Fitts's Law
   Meaning: Time to hit a target depends on its size and distance.
   Flag when: Small or distant primary actions; tiny tap/click targets.
   Area: Usability - Accessibility

3. Hick's Law
   Meaning: Decision time grows with the number and complexity of choices.
   Flag when: Overloaded menus, screens, or option sets.
   Area: Usability

4. Miller's Law
   Meaning: Working memory holds roughly 7 (±2) items.
   Flag when: Long unchunked lists, forms, or sequences with no grouping.
   Area: Usability

5. Tesler's Law
   Meaning: Every system has irreducible complexity; someone absorbs it.
   Flag when: Complexity pushed onto the user that the system could handle.
   Area: Risk

6. Doherty Threshold
   Meaning: Keep system response under ~400ms to hold attention.
   Flag when: Slow responses with no progress indicator to bridge the wait.
   Area: Usability

7. Goal-Gradient Effect
   Meaning: Motivation increases as users near a goal.
   Flag when: Multi-step flows that hide progress or the finish line.
   Area: Usability

8. Zeigarnik Effect
   Meaning: People remember incomplete tasks more than completed ones.
   Flag when: No saved progress; unclear whether a task is finished.
   Area: Usability

9. Serial Position Effect
   Meaning: First and last items are remembered best.
   Flag when: Critical actions buried in the middle of a list or menu.
   Area: Usability

10. Peak-End Rule
   Meaning: An experience is judged by its peak and its end.
   Flag when: Weak or abrupt completion / success / confirmation states.
   Area: Content UX · Usability

11. Postel's Law
   Meaning: Be liberal in what you accept, conservative in what you send.
   Flag when: Rigid input formats that reject reasonable user entries.
   Area: Content UX · Risk

12. Aesthetic-Usability Effect
   Meaning: Users perceive aesthetic designs as more usable.
   Flag when: Visual inconsistency that erodes perceived quality and trust.
   Area: Consistency

13. Von Restorff Effect
   Meaning: The item that stands out is the one that's remembered.
   Flag when: Primary action that fails to stand out from its surroundings.
   Area: Usability

14. Choice Overload
   Meaning: Too many options cause hesitation and abandonment.
   Flag when: Excessive simultaneous choices with no default or guidance.
   Area: Usability
`;

export const CONTENT_MICROCOPY_PRINCIPLES = `
=== CONTENT & MICROCOPY PRINCIPLES ===
You must only flag findings that violate one of these named principles.
If a finding cannot be traced to a principle below, do not include it.

1. Clarity over cleverness
   Meaning: Use plain, direct language a first-time user understands.
   Flag when: Jargon, ambiguity, or clever copy that obscures meaning.
   Area: Content UX

2. Useful error messages
   Meaning: State what went wrong, why, and how to fix it.
   Flag when: Errors that name the failure but offer no path to recovery.
   Area: Content UX

3. Consistent terminology
   Meaning: Use the same word for the same concept everywhere.
   Flag when: The same concept named differently across screens.
   Area: Content UX · Consistency

4. Action-oriented labels
   Meaning: Buttons and links should say what they do.
   Flag when: Vague labels like "OK", "Submit", or "Click here".
   Area: Content UX

5. Consistent voice & tone
   Meaning: Match the product's established voice across all copy.
   Flag when: Tone that shifts abruptly or conflicts with the brand voice.
   Area: Content UX
`;

export const GESTALT_PRINCIPLES = `
=== GESTALT PRINCIPLES ===
You must only flag findings that violate one of these named principles.
If a finding cannot be traced to a principle below, do not include it.

1. Proximity
   Meaning: Elements placed near each other are perceived as related.
   Flag when: Labels drifting from their inputs; unrelated items crowded together.
   Area: Consistency

2. Similarity
   Meaning: Visually similar elements are perceived as a group.
   Flag when: Identical-looking elements that behave differently.
   Area: Consistency · Risk

3. Common Region
   Meaning: Elements inside a shared boundary are seen as grouped.
   Flag when: Controls orphaned outside the card or section they act on.
   Area: Consistency

4. Closure
   Meaning: The mind completes incomplete shapes and patterns.
   Flag when: Visual cues so incomplete the grouping breaks down.
   Area: Consistency

5. Continuity
   Meaning: Aligned elements are perceived as related and continuous.
   Flag when: Broken alignment or flow that fragments a logical group.
   Area: Consistency

6. Figure / Ground
   Meaning: Users distinguish a focal object from its background.
   Flag when: Low separation between foreground and background; ambiguous layering.
   Area: Accessibility · Usability

7. Prägnanz (Simplicity)
   Meaning: People perceive things in their simplest possible form.
   Flag when: Needlessly complex visuals where a simpler form would read faster.
   Area: Usability
`;

export const VISUAL_DESIGN_PRINCIPLES = `
=== VISUAL DESIGN PRINCIPLES ===
You must only flag findings that violate one of these named principles.
If a finding cannot be traced to a principle below, do not include it.

1. Visual hierarchy
   Meaning: Guide the eye through content by order of importance.
   Flag when: Flat hierarchy; multiple elements competing for primary attention.
   Area: Consistency · Usability

2. Contrast (emphasis)
   Meaning: Differentiate elements to direct attention.
   Flag when: Weak emphasis that fails to separate primary from secondary.
   Area: Consistency

3. Alignment
   Meaning: Align elements to create order and visual connection.
   Flag when: Misaligned elements that look unintentional or untidy.
   Area: Consistency

4. Repetition
   Meaning: Repeat patterns and components for a unified system.
   Flag when: One-off components that duplicate existing patterns inconsistently.
   Area: Consistency

5. White space
   Meaning: Give elements room to breathe; use negative space deliberately.
   Flag when: Cramped layouts; no breathing room around dense content.
   Area: Usability

6. Spacing system (grid)
   Meaning: Use a consistent spacing scale (e.g. 8pt grid).
   Flag when: Off-grid, ad-hoc spacing values that break visual rhythm.
   Area: Consistency

7. Meaningful color
   Meaning: Color should encode meaning, not just decorate.
   Flag when: Meaning conveyed by color alone, with no secondary cue.
   Area: Accessibility
`;

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 2 — NEW SUBCATEGORY PRINCIPLE EXPORTS (18 new blocks)
// ─────────────────────────────────────────────────────────────────────────────

// ── USABILITY ────────────────────────────────────────────────────────────────

export const NAVIGATION_LOGIC_PRINCIPLES = `
=== NAVIGATION LOGIC PRINCIPLES ===
You must only flag findings that violate one of these named principles.
If a finding cannot be traced to a principle below, do not include it.

1. Persistent Orientation Cues
   Meaning: Users must always know their location within the product hierarchy.
   Flag when: No active state, breadcrumb, or section header is present on screens
              deeper than one level from the root.
   Severity guide: P1 for screens with no location indicator; P2 if present but ambiguous.

2. Predictable Destination Labeling
   Meaning: Navigation labels must set accurate expectations about the content behind them.
   Flag when: A nav item's destination does not match what its label implies;
              labels are vague (e.g. "More", "Other", "General").
   Severity guide: P1 if consistently misleading; P2 for single isolated mismatches.

3. Consistent Navigation Placement
   Meaning: Primary navigation must appear in the same position across every screen.
   Flag when: Navigation shifts position, disappears, or restructures mid-flow
              without an intentional and signaled context switch.
   Severity guide: P0 if primary navigation vanishes mid-task; P1 if relocated inconsistently.

4. Shallow Depth to Key Destinations
   Meaning: Primary task entry points should be reachable within three interactions
              from any screen in the product.
   Flag when: A core user task requires navigating more than three levels from
              the closest natural entry point.
   Severity guide: P1 for primary tasks; P2 for secondary or advanced tasks.
`;

export const TASK_FLOW_EFFICIENCY_PRINCIPLES = `
=== TASK FLOW EFFICIENCY PRINCIPLES ===
You must only flag findings that violate one of these named principles.
If a finding cannot be traced to a principle below, do not include it.

1. Minimum Viable Steps
   Meaning: Every step in a flow must justify its existence; unnecessary friction
              must be removed.
   Flag when: A step asks for information the system already holds, or introduces
              a screen that produces no decision affecting the outcome.
   Severity guide: P1 if the redundancy adds friction in a primary flow; P2 for minor inefficiencies.

2. Clear Progress Signaling
   Meaning: Multi-step flows must always communicate how many steps remain and
              where the user currently is.
   Flag when: A flow of three or more distinct steps has no step counter,
              progress bar, or visible completion signal.
   Severity guide: P1 for flows with more than three steps; P2 for shorter flows.

3. Smart Defaults and Pre-fill
   Meaning: Forms and inputs should pre-populate data already held by the system
              to reduce re-entry burden.
   Flag when: Data the system already knows (account details, prior selections,
              last-used values) is requested from the user again without explanation.
   Severity guide: P1 if repeated across high-frequency flows; P2 for isolated occurrences.

4. Single Unambiguous Path per Goal
   Meaning: Each user goal should have one recommended, clearly signaled path
              from start to completion.
   Flag when: Multiple competing entry points exist for the same task with no
              guidance on which path to take, or competing paths lead to different outcomes.
   Severity guide: P1 if paths diverge in outcome; P2 if duplicated paths behave identically.
`;

export const RECOGNITION_OVER_RECALL_PRINCIPLES = `
=== RECOGNITION OVER RECALL PRINCIPLES ===
You must only flag findings that violate one of these named principles.
If a finding cannot be traced to a principle below, do not include it.

1. Persistent Visible Options
   Meaning: Available actions and navigation must always be visible; users should
              never need to recall what to do next or where to find an action.
   Flag when: An action is only accessible after the user remembers a previous step
              or memorizes a non-obvious navigation route.
   Severity guide: P1 if the hidden action is part of a primary task; P2 otherwise.

2. Visible Interactive Affordances
   Meaning: Every interactive element must visually signal its clickability or
              tapability through recognized visual conventions.
   Flag when: A link lacks color or underline differentiation from surrounding text;
              a button cannot be visually distinguished from static content.
   Severity guide: P1 if the missing affordance blocks task completion; P2 for secondary elements.

3. State and Context Persistence
   Meaning: When a user's in-progress work or context leaves view, the system must
              preserve it without requiring the user to remember or rebuild it.
   Flag when: Navigating away from an in-progress form or task silently loses
              entered data, with no warning or recovery mechanism.
   Severity guide: P0 if user data is silently and permanently lost; P1 if warned
                   but no recovery is offered.

4. Search and Filter for Large Sets
   Meaning: Large content libraries or lists must offer search or filtering so users
              can locate items without memorizing positions.
   Flag when: A list or dataset of more than ten items has no search input, filter
              controls, or sort capability.
   Severity guide: P1 for primary content libraries; P2 for secondary or administrative lists.
`;

// ── ACCESSIBILITY ─────────────────────────────────────────────────────────────

export const KEYBOARD_NAVIGATION_PRINCIPLES = `
=== KEYBOARD NAVIGATION PRINCIPLES ===
You must only flag findings that violate one of these named principles.
If a finding cannot be traced to a principle below, do not include it.

1. Full Keyboard Operability
   Meaning: Every interactive element — button, link, input, dropdown, modal control —
              must be reachable and operable via keyboard alone (WCAG 2.1.1).
   Flag when: Any element cannot be focused with Tab or activated with Enter, Space,
              or arrow keys as appropriate to its role.
   Severity guide: P0 if an element is completely unreachable by keyboard;
                   P1 if reachable but non-operable.

2. Logical and Sequential Focus Order
   Meaning: The Tab key focus order must follow the natural visual reading order
              of the interface (WCAG 1.3.2, 2.4.3).
   Flag when: Tab order jumps to an unexpected location, skips visible interactive
              elements, or moves backwards through the visual layout without reason.
   Severity guide: P0 if focus order is completely illogical or disorienting;
                   P1 for minor unexpected jumps.

3. No Keyboard Traps
   Meaning: Focus must never be permanently locked inside a component with no
              means of escape (WCAG 2.1.2).
   Flag when: A modal, popover, date-picker, or custom widget traps keyboard focus
              with no Escape key, close button, or documented keyboard exit pattern.
   Severity guide: P0 always — keyboard traps are a blocking WCAG 2.1.2 violation.

4. Visible Focus Indicator
   Meaning: The element that currently holds keyboard focus must display a clearly
              visible indicator at all times (WCAG 2.4.7, 2.4.11).
   Flag when: outline: none is applied without a replacement focus style; or the
              focus ring is present but fails contrast against its background.
   Severity guide: P0 if no visible focus indicator exists anywhere on the page;
                   P1 if the indicator is insufficient in contrast or size.
`;

export const SCREEN_READER_PRINCIPLES = `
=== SCREEN READER INTERPRETATION PRINCIPLES ===
You must only flag findings that violate one of these named principles.
If a finding cannot be traced to a principle below, do not include it.

1. Semantic Markup and ARIA Roles
   Meaning: Every interactive element must use correct HTML semantics or ARIA roles
              so assistive technologies can announce it accurately (WCAG 4.1.2).
   Flag when: Buttons are implemented as <div> or <span> with no role attribute;
              heading levels are skipped; page landmarks (main, nav, aside) are absent.
   Severity guide: P0 for interactive controls with no accessible role;
                   P1 for mislabeled or missing page landmarks.

2. Meaningful Alternative Text
   Meaning: All informational images, icons, and non-text content must carry alt text
              or an aria-label that conveys their purpose to screen reader users (WCAG 1.1.1).
   Flag when: Non-decorative images have empty, missing, or filename-based alt text;
              icon-only buttons carry no accessible label.
   Severity guide: P0 if critical task information is entirely lost without the image;
                   P1 for supporting or contextual visuals.

3. Programmatically Associated Form Labels
   Meaning: Every form control must have a label that is machine-linked via for/id,
              aria-labelledby, or aria-label (WCAG 1.3.1, 3.3.2).
   Flag when: Inputs rely only on visible placeholder text or visually proximate labels
              that are not programmatically associated with their control.
   Severity guide: P0 for required fields in primary flows; P1 for optional fields.

4. Live Region Announcements for Dynamic Content
   Meaning: Content that updates asynchronously — toasts, inline validation, status
              banners — must be surfaced to screen readers via ARIA live regions (WCAG 4.1.3).
   Flag when: An async result, inline error, or status message updates visually
              but produces no announcement in screen reader output.
   Severity guide: P0 if the missed announcement is a blocking error or critical status;
                   P1 for non-critical dynamic updates.
`;

export const TOUCH_TARGETS_PRINCIPLES = `
=== TOUCH TARGETS ≥ 44PX PRINCIPLES ===
You must only flag findings that violate one of these named principles.
If a finding cannot be traced to a principle below, do not include it.

1. Minimum Target Size
   Meaning: All interactive elements must have a tap/click area of at least
              44×44 CSS pixels (WCAG 2.5.5 AAA target; 24×24 at AA).
   Flag when: Icon buttons, checkboxes, radio buttons, links, or small controls
              are visually or interactively below 44×44 px on touch surfaces.
   Severity guide: P0 for elements below 24×24 px; P1 for elements between 24 and 44 px.

2. Adequate Spacing Between Adjacent Targets
   Meaning: Neighboring interactive elements must have sufficient non-interactive
              space between them to prevent accidental activation.
   Flag when: Two tappable elements are separated by fewer than 8 px of
              non-interactive padding or whitespace.
   Severity guide: P1 for adjacent primary actions; P2 for secondary controls.

3. Thumb-Zone Placement for Primary Actions
   Meaning: High-frequency and critical actions on mobile must be placed within
              comfortable one-handed thumb reach (typically the lower two-thirds of the screen).
   Flag when: The primary CTA on a mobile-first surface is placed at the top of
              the screen, requiring an uncomfortable grip shift to reach.
   Severity guide: P1 for primary CTAs on mobile-dominant surfaces; P2 for secondary actions.

4. Invisible Hit-Area Expansion
   Meaning: If a target is visually small, its interactive hit area must be padded
              to meet the minimum size without altering the visual design.
   Flag when: A visually small control (e.g., a 16×16 icon) has no CSS padding or
              invisible hit-area extension bringing it up to the minimum tap size.
   Severity guide: P1 if the effective tap area is measurably below minimum; P2 for borderline cases.
`;

// ── CONSISTENCY ───────────────────────────────────────────────────────────────

export const DESIGN_SYSTEM_TOKENS_PRINCIPLES = `
=== DESIGN SYSTEM TOKENS PRINCIPLES ===
You must only flag findings that violate one of these named principles.
If a finding cannot be traced to a principle below, do not include it.

1. Token-Only Property Values
   Meaning: All visual properties — color, typography, border radius, shadow, spacing —
              must reference defined design tokens and never use raw hard-coded values.
   Flag when: Hard-coded hex colors, arbitrary px font sizes, or magic-number radii appear
              in component specs or implementation outside of a token definition file.
   Severity guide: P1 for violations on frequently used components; P2 for isolated screens.

2. Semantic Token Selection
   Meaning: Tokens must be chosen for their semantic intent, not just their visual output.
   Flag when: A "danger" color token is used decoratively; a "primary-action" token is
              applied to a tertiary control; a token is used for a role other than its
              documented purpose.
   Severity guide: P1 if the misuse creates confusing UI signals (e.g., red = danger
                   used for a non-destructive element); P2 for purely cosmetic token misuse.

3. Full Light / Dark Mode Token Parity
   Meaning: Every token used in production must have a defined counterpart for both
              light and dark color modes.
   Flag when: A component references a light-mode token that has no dark-mode equivalent,
              causing visual failure or inaccessible contrast in dark themes.
   Severity guide: P1 for components that break visually in dark mode;
                   P2 for minor visual inconsistency.

4. Documented Token Usage Contracts
   Meaning: Every token in active production use must have a defined purpose, usage
              context, and any constraints recorded in design system documentation.
   Flag when: Undocumented, aliased, or deprecated tokens are found in production
              components without a migration note or canonical replacement listed.
   Severity guide: P1 where undocumented token misuse carries accessibility or
                   brand-integrity risk; P2 for low-risk undocumented tokens.
`;

export const COMPONENT_USAGE_PRINCIPLES = `
=== COMPONENT USAGE PRINCIPLES ===
You must only flag findings that violate one of these named principles.
If a finding cannot be traced to a principle below, do not include it.

1. Library-First Component Selection
   Meaning: All UI patterns must use an existing design system component before any
              custom component is built.
   Flag when: A newly introduced one-off component duplicates the function of an
              existing library component with only cosmetic differences.
   Severity guide: P1 for duplications of core components (buttons, inputs, modals,
                   cards); P2 for peripheral or domain-specific patterns.

2. Variant and Prop Adherence
   Meaning: Components must be used within their defined variant and property set;
              ad-hoc visual overrides at the instance level are not permitted.
   Flag when: A component's padding, color, size, or layout is overridden at the
              instance level outside of its officially defined variant configuration.
   Severity guide: P1 for overrides that violate token or accessibility requirements;
                   P2 for minor cosmetic deviations.

3. Complete Interaction State Coverage
   Meaning: Every interactive component must have all required states designed and
              implemented: default, hover, focus, active, disabled, loading, and error.
   Flag when: A component is shipped missing one or more standard states, causing
              undefined visual or behavioral outcomes in those states.
   Severity guide: P1 for missing focus or error states (direct accessibility and
                   usability impact); P2 for missing hover or loading states.

4. Composition Over Custom Builds
   Meaning: Complex UI surfaces must be built by composing existing components;
              base library components must not be modified for one-off use cases.
   Flag when: A base library component is directly altered at the source level to
              serve a specific single-use need rather than through composition or
              a new defined variant.
   Severity guide: P1 if the modification breaks token compliance or accessibility;
                   P2 for cosmetic-only modifications.
`;

export const SPACING_GRID_PRINCIPLES = `
=== SPACING 8PT GRID PRINCIPLES ===
You must only flag findings that violate one of these named principles.
If a finding cannot be traced to a principle below, do not include it.

1. 8pt Grid Compliance
   Meaning: All spacing values — margins, padding, gaps, and gutters — must be
              multiples of 8 px (or 4 px for fine-grain adjustments within components).
   Flag when: Spacing values of 3, 5, 7, 11, 13, or other non-scale values appear
              in component specifications or implementation.
   Severity guide: P1 for violations on core or widely-used components;
                   P2 for isolated screens or rarely-visited views.

2. Consistent Intra-Component Padding
   Meaning: Components of the same type must use consistent internal padding drawn
              from the spacing scale.
   Flag when: Two visually similar components (e.g., two card variants) use different
              internal padding values without a documented design rationale.
   Severity guide: P1 if the inconsistency is visible and likely to be perceived as
                   a defect; P2 if subtle and contained to a single context.

3. Column Grid Adherence
   Meaning: All content must align to the defined column grid; no elements should
              fall between columns or violate gutter boundaries without intent.
   Flag when: Elements are placed between columns, ignore defined gutters, or use
              custom widths that break the grid rhythm.
   Severity guide: P1 for primary page layouts and hero sections; P2 for content
                   elements within component-level containers.

4. Responsive Spacing Scaling
   Meaning: Spacing values must scale appropriately across breakpoints using the
              same token scale — desktop values must not be carried unchanged to mobile.
   Flag when: A layout or component uses desktop spacing values unchanged on mobile,
              resulting in cramped or disproportionately large spacing on small screens.
   Severity guide: P1 if mobile usability or readability is measurably impaired;
                   P2 for minor visual tightness.
`;

export const ICONOGRAPHY_CONSISTENCY_PRINCIPLES = `
=== ICONOGRAPHY CONSISTENCY PRINCIPLES ===
You must only flag findings that violate one of these named principles.
If a finding cannot be traced to a principle below, do not include it.

1. Single Icon Family
   Meaning: All icons throughout the product must come from one defined icon library;
              mixing visual families within the same product is not permitted.
   Flag when: Icons from different families (e.g., outlined vs. filled, rounded vs.
              sharp, two different third-party libraries) are mixed within the same
              screen, component, or navigation surface.
   Severity guide: P1 if mixing is prominent across the primary UI; P2 for a single
                   isolated screen or edge-case context.

2. Consistent Icon Sizing
   Meaning: Icons must be rendered at defined sizes from the icon scale (e.g., 16, 20,
              24, 32 px) and must not be scaled arbitrarily to fit containers.
   Flag when: An icon is scaled to a non-standard size to fill a given space rather
              than selecting the nearest defined size from the icon scale.
   Severity guide: P1 for icons in primary navigation or action bars; P2 for decorative
                   or supporting icons in secondary contexts.

3. Semantic Icon Consistency
   Meaning: Each icon must reliably represent the same concept wherever it appears
              in the product; no icon may serve two different functions.
   Flag when: The same icon glyph is used to represent two different actions or
              concepts (e.g., a pencil icon used for both "Edit" and "Compose New").
   Severity guide: P1 for icons in primary navigation or action bars where confusion
                   directly affects task completion; P2 for secondary contexts.

4. Label Pairing for Ambiguous Icons
   Meaning: Icons that are not universally understood must be paired with a text
              label or accessible tooltip to prevent misinterpretation.
   Flag when: A non-universal icon (any symbol beyond a small set of globally
              recognized glyphs like close/×, search/magnifier, back/arrow) appears
              in a primary flow without a visible label or tooltip.
   Severity guide: P1 for unlabeled ambiguous icons in primary flows or navigation;
                   P2 for icon-only controls in expert or power-user contexts.
`;

// ── RISK ─────────────────────────────────────────────────────────────────────

export const SECTION_508_PRINCIPLES = `
=== COMPLIANCE (SECTION 508) PRINCIPLES ===
You must only flag findings that violate one of these named principles.
If a finding cannot be traced to a principle below, do not include it.

1. WCAG 2.0 Level AA Technical Baseline
   Meaning: All ICT must conform to WCAG 2.0 Level AA as mandated by the 2017
              Section 508 Refresh; this is the non-negotiable compliance floor for
              federal agencies and their contractors.
   Flag when: Any WCAG 2.0 AA success criterion is demonstrably violated in a
              product that is delivered to, procured by, or used by a federal agency.
   Severity guide: P0 for functional blockers (missing keyboard access, absent labels);
                   P1 for perceivability and operability degradations.

2. Functional Performance Criteria Coverage
   Meaning: Where full technical conformance is unachievable, the product must satisfy
              the Section 508 Functional Performance Criteria (e.g., usable without
              vision, without hearing, with limited mobility) per Chapter 3.
   Flag when: A non-conformant component has no documented alternative access path
              that satisfies the relevant functional criterion for affected user groups.
   Severity guide: P0 if a user group is completely excluded from a core function;
                   P1 if degraded but partial access is available.

3. VPAT / ACR Documentation Currency
   Meaning: Any product delivered to or procured by a federal agency must have
              a current, accurate Accessibility Conformance Report (ACR / VPAT).
   Flag when: A product lacks a VPAT, or the existing ACR is more than 12 months
              old or does not reflect the current production version of the product.
   Severity guide: P1 for procurement-stage products; P2 for already-deployed products
                   with a remediation roadmap in progress.

4. Assistive Technology Compatibility
   Meaning: All software interfaces must be fully operable with leading assistive
              technologies (screen readers, magnifiers, switch access) per Section 508 §E207.
   Flag when: A critical user flow is non-functional or severely degraded when tested
              with NVDA, JAWS, VoiceOver, or Dragon NaturallySpeaking on the target platform.
   Severity guide: P0 for complete AT failures on primary flows; P1 for degraded
                   but partially functional AT experiences.
`;

export const DOMAIN_REGULATION_PRINCIPLES = `
=== DOMAIN REGULATION (HIPAA, BFSI) PRINCIPLES ===
You must only flag findings that violate one of these named principles.
If a finding cannot be traced to a principle below, do not include it.

1. Minimum Necessary Data Exposure
   Meaning: Only the minimum PHI or sensitive financial data required for the current
              task should be visible in the UI (HIPAA Minimum Necessary Rule; GLBA
              data minimization principle).
   Flag when: A screen surfaces full account numbers, complete PHI fields, or
              financial records beyond what the current task requires; sensitive data
              is visible without a deliberate user-triggered disclosure action.
   Severity guide: P0 for unmasked critical identifiers (SSN, full card numbers,
                   full PHI fields); P1 for over-exposed secondary data.

2. Session Timeout and Re-Authentication
   Meaning: Any screen displaying PHI or financial data must auto-timeout after a
              defined period of inactivity and require re-authentication to resume
              (HIPAA Security Rule §164.312(a)(2)(iii); PCI DSS Requirement 8.2.8).
   Flag when: A sensitive-data screen has no session timeout; or the timeout occurs
              with no visible countdown and no clear re-authentication prompt.
   Severity guide: P0 for PHI or financial screens with no timeout at all;
                   P1 for timeouts that lack a re-auth prompt or countdown.

3. Consent and Privacy Disclosure at Point of Collection
   Meaning: Users must see a clear, plain-language notice of what data is collected
              and why before any PHI or regulated financial data is submitted.
   Flag when: A data collection form in a regulated context lacks a linked privacy
              notice, consent acknowledgment, or explicit disclosure of data purpose
              at the point of collection.
   Severity guide: P0 for regulated data collection with no disclosure of any kind;
                   P1 for vague, buried, or post-submission disclosures.

4. Audit Trail Visibility Cues
   Meaning: UI actions that create, modify, or export regulated data should signal
              that they are being logged, supporting HIPAA audit control requirements
              and BFSI regulatory traceability obligations.
   Flag when: A screen allows viewing, editing, downloading, or exporting of PHI or
              financial records with no visual indication that the action is being recorded.
   Severity guide: P1 for regulated actions in audit-mandatory domains (healthcare,
                   banking, insurance); P2 for lower-sensitivity business contexts.
`;

export const DESTRUCTIVE_ACTION_SAFETY_PRINCIPLES = `
=== DESTRUCTIVE ACTION SAFETY PRINCIPLES ===
You must only flag findings that violate one of these named principles.
If a finding cannot be traced to a principle below, do not include it.

1. Explicit Confirmation Before Irreversible Actions
   Meaning: Any action that permanently deletes, overwrites, or irreversibly submits
              data must require a distinct, deliberate confirmation step before
              execution (related: Nielsen Heuristic #3 and #5).
   Flag when: A destructive action executes immediately on a single click or tap
              with no intermediate confirmation dialog, checkbox, or re-type step.
   Severity guide: P0 for permanent data deletion with no recovery; P1 for destructive
                   overwrites or irreversible submissions.

2. Unambiguous Destructive Labeling
   Meaning: Controls that trigger destructive actions must use explicit, specific
              language and must be visually differentiated from safe actions.
   Flag when: A delete or permanent-action button uses neutral labels ("OK",
              "Continue", "Submit") or is visually indistinguishable from adjacent
              safe actions (no red/danger color, no warning icon, no distinct style).
   Severity guide: P0 if the destructive control is completely indistinguishable from
                   a safe action; P1 if labeling is present but ambiguous.

3. Undo or Grace-Period Recovery
   Meaning: Where technically feasible, a time-limited undo mechanism or soft-delete
              with a recovery window must follow every destructive action.
   Flag when: A destructive action is immediately permanent with no undo option,
              soft-delete state, recycle bin, or recovery window offered to the user.
   Severity guide: P0 for irreversible actions on user-generated content with no
                   recovery path; P1 if recovery is technically possible but not surfaced.

4. Spatial Isolation of Danger Controls
   Meaning: Destructive action controls must be visually and spatially separated
              from safe action controls to prevent accidental activation.
   Flag when: A "Delete" or "Remove" control is placed immediately adjacent to a
              "Save", "Confirm", or "Submit" button without clear visual separation
              such as spacing, a divider, or grouping boundaries.
   Severity guide: P1 for primary flows where accidental activation risk is high;
                   P2 for low-frequency or admin-level destructive actions.
`;

export const DATA_PRIVACY_PRINCIPLES = `
=== DATA PRIVACY DISCLOSURES PRINCIPLES ===
You must only flag findings that violate one of these named principles.
If a finding cannot be traced to a principle below, do not include it.

1. Consent Before Data Collection
   Meaning: Users must see a clear, plain-language disclosure of what data is
              collected and for what purpose before any personal data is submitted
              (GDPR Article 13; CCPA §1798.100).
   Flag when: A form collects personal data (name, email, location, payment info,
              device identifiers) with no visible privacy notice link, disclosure
              statement, or consent mechanism at the point of collection.
   Severity guide: P0 if legally required consent is absent in a regulated jurisdiction;
                   P1 if disclosure is present but obscure or post-submission.

2. Granular Opt-In / Opt-Out Controls
   Meaning: Users must be able to consent to or decline non-essential data
              collection independently, without losing access to core functionality
              (GDPR Article 7; CCPA right to opt-out).
   Flag when: Consent for non-essential data use is bundled into an all-or-nothing
              agreement; opting out of analytics or marketing data removes access
              to features unrelated to that data use.
   Severity guide: P0 for legally non-compliant bundled consent in GDPR/CCPA
                   jurisdictions; P1 for coercive dark-pattern opt-out flows.

3. Data Retention and Deletion Transparency
   Meaning: Users must be informed of how long their data is retained and must have
              a clear mechanism to request its deletion (GDPR Article 17; CCPA §1798.105).
   Flag when: Account or settings screens contain no retention period disclosure,
              no data export option, and no deletion or account-removal mechanism.
   Severity guide: P1 for products operating in regulated jurisdictions; P2 for
                   products with no current regulatory obligations but user-trust risk.

4. Purpose Limitation at Point of Collection
   Meaning: Each data field must state its specific, bounded purpose at the point
              it is collected — not only within a remote privacy policy document.
   Flag when: A generic phrase such as "to improve your experience" or "for product
              analytics" is the only stated purpose; no field-level or flow-level
              explanation is provided for sensitive inputs.
   Severity guide: P1 for sensitive or regulated data fields (health, financial,
                   biometric); P2 for standard contact information fields.
`;

// ── RECOMMENDATIONS ───────────────────────────────────────────────────────────

export const BUSINESS_IMPACT_PRINCIPLES = `
=== BUSINESS IMPACT ESTIMATE PRINCIPLES ===
You must only flag findings that violate one of these named principles.
If a finding cannot be traced to a principle below, do not include it.

1. Metric-Linked Impact Framing
   Meaning: Every recommendation must explicitly name the business metric it affects
              — conversion rate, error rate, task completion time, support volume,
              churn rate, NPS, or revenue — not just the UX outcome.
   Flag when: A recommendation is framed solely in UX terms ("this will feel clearer",
              "users will find it easier") with no tie to a measurable business outcome.
   Severity guide: Required for all P0 and P1 findings; strongly encouraged for P2.

2. Severity-to-Outcome Mapping
   Meaning: High-severity findings (P0/P1) must include an estimated range of business
              consequence to help stakeholders justify prioritization.
   Flag when: A P0 or P1 finding contains no estimated impact range on revenue,
              user retention, task productivity, or compliance risk.
   Severity guide: Required for all P0 and P1 findings in a deliverable report.

3. Quick Win vs. Strategic Fix Classification
   Meaning: Recommendations must be classified to distinguish quick wins (high impact,
              low effort) from strategic improvements (high impact, high effort),
              enabling informed sequencing.
   Flag when: All recommendations are listed at the same priority tier without an
              effort/impact distinction, leaving stakeholders unable to sequence work.
   Severity guide: Required in any audit report containing more than three findings.

4. Benchmark or Competitive Reference
   Meaning: Where available, high-severity recommendations should reference industry
              benchmarks, usability research, or competitor patterns to contextualize
              the cost of non-resolution.
   Flag when: A P0 or P1 finding that affects a widely measured metric (e.g., form
              completion, checkout success) lacks any external reference to help
              stakeholders understand relative risk.
   Severity guide: Encouraged for P0/P1; optional for P2.
`;

export const EFFORT_ESTIMATE_PRINCIPLES = `
=== EFFORT ESTIMATE PRINCIPLES ===
You must only flag findings that violate one of these named principles.
If a finding cannot be traced to a principle below, do not include it.

1. T-Shirt Size Effort Categorization
   Meaning: Each recommendation must include a coarse implementation effort estimate
              (S / M / L / XL) so stakeholders can plan prioritization without needing
              a formal scoping session.
   Flag when: A recommendation is provided with no effort indication, leaving the
              team unable to assess implementation cost relative to business impact.
   Severity guide: Required for all findings in any deliverable report.

2. Cross-Discipline Effort Breakdown
   Meaning: Effort estimates must identify which disciplines are affected and who
              owns the work (Design / Dev / Content / QA / Accessibility).
   Flag when: An effort estimate is given as a single size or number without
              specifying which team or function must take action.
   Severity guide: Required for M, L, and XL effort items; optional for S items
                   where the owner is obvious.

3. Dependency and Sequencing Flags
   Meaning: Recommendations that are blocked by, or must precede, another item must
              explicitly name that dependency so the team can sequence work correctly.
   Flag when: A recommendation that requires prior design-system, back-end, or
              regulatory groundwork is listed as independently actionable without
              flagging the prerequisite.
   Severity guide: Required whenever a clear technical, design, or compliance
                   dependency exists between two or more findings.

4. Quick-Win Identification
   Meaning: Items that are both high-impact and low-effort (S or M size) must be
              explicitly flagged as quick wins to guide sprint planning.
   Flag when: A finding is clearly high-impact and low-effort but is not surfaced
              as a quick win, causing it to be deprioritized against larger strategic items.
   Severity guide: Required for any S or M effort item rated P0 or P1 on impact.
`;

export const ACCEPTANCE_CRITERIA_PRINCIPLES = `
=== ACCEPTANCE CRITERIA PRINCIPLES ===
You must only flag findings that violate one of these named principles.
If a finding cannot be traced to a principle below, do not include it.

1. Testable, Behavior-Based Success Definition
   Meaning: Each recommendation must include a concrete acceptance criterion in the
              form "Given [context], when [action], then [observable outcome]" — not
              a subjective description of desired quality.
   Flag when: Acceptance criteria use subjective language ("should feel clearer",
              "looks better", "more intuitive") without a verifiable behavior or
              measurable result that a tester can evaluate pass/fail.
   Severity guide: Required for all actionable recommendations in a deliverable report.

2. Design-to-Implementation Parity Standard
   Meaning: Acceptance criteria must reference the design specification and state an
              agreed tolerance for implementation (e.g., "matches component spec;
              spacing within 4 px of 8pt grid value").
   Flag when: No design spec, pixel tolerance, or named component reference is cited
              in the acceptance criterion, leaving developers without a clear pass/fail
              benchmark.
   Severity guide: Required for all findings involving visual, layout, or
                   component-level changes.

3. Accessibility Pass Gate
   Meaning: Every recommendation that affects interactive UI must include a mandatory
              accessibility verification step as part of its acceptance criterion.
   Flag when: Acceptance criteria for a UI change make no mention of keyboard
              operability, screen reader behavior, WCAG success criteria, or AT testing.
   Severity guide: Required for all interactive component changes; recommended
                   for layout and content changes.

4. Regression Non-Introduction Clause
   Meaning: Acceptance criteria must state that the fix does not introduce new issues
              in adjacent components or flows that share the modified element.
   Flag when: Acceptance criteria focus entirely on the target fix without specifying
              that adjacent or downstream behavior must remain unaffected.
   Severity guide: Required for any change to a shared, design-system, or high-traffic
                   component; recommended for page-level layout changes.
`;

export const LINKED_PRINCIPLE_PRINCIPLES = `
=== LINKED PRINCIPLE PRINCIPLES ===
You must only flag findings that violate one of these named principles.
If a finding cannot be traced to a principle below, do not include it.

1. Mandatory Principle Citation per Finding
   Meaning: Every finding must be linked to exactly one named principle from the
              active principle family configured for the current review scope.
   Flag when: A finding is reported with no named principle cited, or with a
              free-text rationale that cannot be mapped to any principle in the
              configured family.
   Severity guide: Required for all findings — unlinked findings must be excluded
                   from the report output.

2. No Orphan Recommendations
   Meaning: Recommendations not traceable to a named, in-scope principle must not
              appear in the report output.
   Flag when: A recommendation appears to be based on subjective aesthetic preference,
              team convention, or personal opinion with no backing from the active
              principle family.
   Severity guide: Required — orphan recommendations undermine audit credibility,
                   repeatability, and legal defensibility.

3. Cross-Family Citation When Applicable
   Meaning: When a finding clearly violates principles from more than one active
              family (e.g., both an accessibility principle and a usability principle),
              all relevant cross-citations should be noted alongside the primary citation.
   Flag when: A finding violates principles from two or more families but only one
              family is cited, leaving the full risk of the finding understated.
   Severity guide: Encouraged for all P0 and P1 findings; optional for P2.

4. Principle Family Fitness Verification
   Meaning: The principle family cited for a finding must match the category of the
              component or issue under review.
   Flag when: A visual design principle is cited for a content clarity issue; an
              accessibility principle is applied to a branding inconsistency; a
              risk principle is used to flag a preference-level UX concern.
   Severity guide: P1 if the mismatch creates a misleading or legally indefensible
                   audit record; P2 for borderline category overlaps.
`;

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 3 — ORIGINAL FAMILY-LEVEL KEYS, TYPES & MAPS (UNCHANGED)
// ─────────────────────────────────────────────────────────────────────────────

export const PRINCIPLE_FAMILY_KEYS = [
   "nielsen",
   "pour",
   "cognitive",
   "contentMicrocopy",
   "gestalt",
   "visualDesign",
] as const;

export type PrincipleFamilyKey = typeof PRINCIPLE_FAMILY_KEYS[number];

export const PRINCIPLE_FAMILY_PROMPTS: Record<PrincipleFamilyKey, string> = {
   nielsen: NIELSEN_PRINCIPLES,
   pour: POUR_PRINCIPLES,
   cognitive: COGNITIVE_LAWS,
   contentMicrocopy: CONTENT_MICROCOPY_PRINCIPLES,
   gestalt: GESTALT_PRINCIPLES,
   visualDesign: VISUAL_DESIGN_PRINCIPLES,
};

export const PRINCIPLE_FAMILY_DISPLAY_NAMES: Record<PrincipleFamilyKey, string> = {
   nielsen: "Usability",
   pour: "Accessibility",
   cognitive: "Consistency",
   contentMicrocopy: "Content UX",
   gestalt: "Risk",
   visualDesign: "Recommendations",
};

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 4 — SUBCATEGORY-LEVEL KEYS, TYPES & MAPS (NEW)
// ─────────────────────────────────────────────────────────────────────────────
//
// Usage: when a user selects a subcategory checkbox in the UI, look up its key
// in SUBCATEGORY_PROMPTS and inject the result into the agent's system prompt.
//
// Subcategories already covered by original exports (✅ below) point to those
// existing constants — no duplicate principle content is introduced.
//
// ─────────────────────────────────────────────────────────────────────────────

export const SUBCATEGORY_KEYS = [
   // USABILITY
   "nielsensHeuristics",      // ✅ covered by NIELSEN_PRINCIPLES
   "navigationLogic",         // 🆕
   "taskFlowEfficiency",      // 🆕
   "recognitionOverRecall",   // 🆕
   // ACCESSIBILITY
   "wcagConformance",         // ✅ covered by POUR_PRINCIPLES
   "keyboardNavigation",      // 🆕
   "screenReaderInterpretation", // 🆕
   "touchTargets",            // 🆕
   // CONSISTENCY
   "designSystemTokens",      // 🆕
   "componentUsage",          // 🆕
   "spacingGrid",             // 🆕
   "iconographyConsistency",  // 🆕
   // CONTENT UX — all covered by CONTENT_MICROCOPY_PRINCIPLES
   "microcopyClarity",        // ✅
   "errorMessageQuality",     // ✅
   "labelPrecision",          // ✅
   "toneAndVoice",            // ✅
   // RISK
   "section508Compliance",    // 🆕
   "domainRegulation",        // 🆕
   "destructiveActionSafety", // 🆕
   "dataPrivacyDisclosures",  // 🆕
   // RECOMMENDATIONS
   "businessImpactEstimate",  // 🆕
   "effortEstimate",          // 🆕
   "acceptanceCriteria",      // 🆕
   "linkedPrinciple",         // 🆕
] as const;

export type SubcategoryKey = typeof SUBCATEGORY_KEYS[number];

/** Maps each UI subcategory to its injected principle block. */
export const SUBCATEGORY_PROMPTS: Record<SubcategoryKey, string> = {
   // USABILITY
   nielsensHeuristics:         NIELSEN_PRINCIPLES,
   navigationLogic:            NAVIGATION_LOGIC_PRINCIPLES,
   taskFlowEfficiency:         TASK_FLOW_EFFICIENCY_PRINCIPLES,
   recognitionOverRecall:      RECOGNITION_OVER_RECALL_PRINCIPLES,
   // ACCESSIBILITY
   wcagConformance:            POUR_PRINCIPLES,
   keyboardNavigation:         KEYBOARD_NAVIGATION_PRINCIPLES,
   screenReaderInterpretation: SCREEN_READER_PRINCIPLES,
   touchTargets:               TOUCH_TARGETS_PRINCIPLES,
   // CONSISTENCY
   designSystemTokens:         DESIGN_SYSTEM_TOKENS_PRINCIPLES,
   componentUsage:             COMPONENT_USAGE_PRINCIPLES,
   spacingGrid:                SPACING_GRID_PRINCIPLES,
   iconographyConsistency:     ICONOGRAPHY_CONSISTENCY_PRINCIPLES,
   // CONTENT UX — all share the same block (each contains principles for all 4 subcategories)
   microcopyClarity:           CONTENT_MICROCOPY_PRINCIPLES,
   errorMessageQuality:        CONTENT_MICROCOPY_PRINCIPLES,
   labelPrecision:             CONTENT_MICROCOPY_PRINCIPLES,
   toneAndVoice:               CONTENT_MICROCOPY_PRINCIPLES,
   // RISK
   section508Compliance:       SECTION_508_PRINCIPLES,
   domainRegulation:           DOMAIN_REGULATION_PRINCIPLES,
   destructiveActionSafety:    DESTRUCTIVE_ACTION_SAFETY_PRINCIPLES,
   dataPrivacyDisclosures:     DATA_PRIVACY_PRINCIPLES,
   // RECOMMENDATIONS
   businessImpactEstimate:     BUSINESS_IMPACT_PRINCIPLES,
   effortEstimate:             EFFORT_ESTIMATE_PRINCIPLES,
   acceptanceCriteria:         ACCEPTANCE_CRITERIA_PRINCIPLES,
   linkedPrinciple:            LINKED_PRINCIPLE_PRINCIPLES,
};

/** Human-readable labels for each subcategory (matches the UI checkbox labels). */
export const SUBCATEGORY_DISPLAY_NAMES: Record<SubcategoryKey, string> = {
   // USABILITY
   nielsensHeuristics:         "Nielsen's 10 Heuristics",
   navigationLogic:            "Navigation Logic",
   taskFlowEfficiency:         "Task Flow Efficiency",
   recognitionOverRecall:      "Recognition Over Recall",
   // ACCESSIBILITY
   wcagConformance:            "WCAG 2.2 AA Conformance",
   keyboardNavigation:         "Keyboard Navigation",
   screenReaderInterpretation: "Screen Reader Interpretation",
   touchTargets:               "Touch Targets ≥ 44px",
   // CONSISTENCY
   designSystemTokens:         "Design System Tokens",
   componentUsage:             "Component Usage",
   spacingGrid:                "Spacing 8pt Grid",
   iconographyConsistency:     "Iconography Consistency",
   // CONTENT UX
   microcopyClarity:           "Microcopy Clarity",
   errorMessageQuality:        "Error Message Quality",
   labelPrecision:             "Label Precision",
   toneAndVoice:               "Tone & Voice",
   // RISK
   section508Compliance:       "Compliance (Section 508)",
   domainRegulation:           "Domain Regulation (HIPAA, BFSI)",
   destructiveActionSafety:    "Destructive Action Safety",
   dataPrivacyDisclosures:     "Data Privacy Disclosures",
   // RECOMMENDATIONS
   businessImpactEstimate:     "Business Impact Estimate",
   effortEstimate:             "Effort Estimate",
   acceptanceCriteria:         "Acceptance Criteria",
   linkedPrinciple:            "Linked Principle",
};

/** Maps each subcategory to its parent category (matches the section headers in the UI). */
export const SUBCATEGORY_CATEGORIES: Record<SubcategoryKey, string> = {
   nielsensHeuristics:         "Usability",
   navigationLogic:            "Usability",
   taskFlowEfficiency:         "Usability",
   recognitionOverRecall:      "Usability",
   wcagConformance:            "Accessibility",
   keyboardNavigation:         "Accessibility",
   screenReaderInterpretation: "Accessibility",
   touchTargets:               "Accessibility",
   designSystemTokens:         "Consistency",
   componentUsage:             "Consistency",
   spacingGrid:                "Consistency",
   iconographyConsistency:     "Consistency",
   microcopyClarity:           "Content UX",
   errorMessageQuality:        "Content UX",
   labelPrecision:             "Content UX",
   toneAndVoice:               "Content UX",
   section508Compliance:       "Risk",
   domainRegulation:           "Risk",
   destructiveActionSafety:    "Risk",
   dataPrivacyDisclosures:     "Risk",
   businessImpactEstimate:     "Recommendations",
   effortEstimate:             "Recommendations",
   acceptanceCriteria:         "Recommendations",
   linkedPrinciple:            "Recommendations",
};

/**
 * Maps each subcategory to the backend agent node name that handles it.
 * Used to determine which agents to activate when a user selects subcategories.
 *
 * Internal node names (usability, accessibility, cognitiveInteraction,
 * contentMicrocopy, gestalt, visualDesign) are preserved for backward
 * compatibility with LangGraph's graph wiring.
 */
export const SUBCATEGORY_TO_AGENT_MAP: Record<SubcategoryKey, string> = {
   // Usability category → usability agent
   nielsensHeuristics:         "usability",
   navigationLogic:            "usability",
   taskFlowEfficiency:         "usability",
   recognitionOverRecall:      "usability",
   // Accessibility category → accessibility agent
   wcagConformance:            "accessibility",
   keyboardNavigation:         "accessibility",
   screenReaderInterpretation: "accessibility",
   touchTargets:               "accessibility",
   // Consistency category → cognitiveInteraction agent (repurposed)
   designSystemTokens:         "cognitiveInteraction",
   componentUsage:             "cognitiveInteraction",
   spacingGrid:                "cognitiveInteraction",
   iconographyConsistency:     "cognitiveInteraction",
   // Content UX category → contentMicrocopy agent (repurposed)
   microcopyClarity:           "contentMicrocopy",
   errorMessageQuality:        "contentMicrocopy",
   labelPrecision:             "contentMicrocopy",
   toneAndVoice:               "contentMicrocopy",
   // Risk category → gestalt agent (repurposed)
   section508Compliance:       "gestalt",
   domainRegulation:           "gestalt",
   destructiveActionSafety:    "gestalt",
   dataPrivacyDisclosures:     "gestalt",
   // Recommendations category → visualDesign agent (repurposed)
   businessImpactEstimate:     "visualDesign",
   effortEstimate:             "visualDesign",
   acceptanceCriteria:         "visualDesign",
   linkedPrinciple:            "visualDesign",
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS (UNCHANGED)
// ─────────────────────────────────────────────────────────────────────────────

export function extractPrincipleNames(principleBlock: string): string[] {
   const names = principleBlock
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => /^\d+\.\s+/.test(line))
      .map((line) => line.replace(/^\d+\.\s+/, "").trim());

   return Array.from(new Set(names));
}
