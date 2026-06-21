/**
 * principles.ts
 * --------------
 *
 * This string is injected directly into the usability agent's system prompt.
 * No RAG needed — ~1,500 tokens, fits easily in any modern LLM context window.
 *
 * Source: UXM Co-Pilot PRD v1.0, Appendix A.1 + A.2
 */

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
   nielsen: "Nielsen",
   pour: "WCAG POUR",
   cognitive: "Cognitive Interaction",
   contentMicrocopy: "Content & Microcopy",
   gestalt: "Gestalt",
   visualDesign: "Visual Design",
};

export function extractPrincipleNames(principleBlock: string): string[] {
   const names = principleBlock
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => /^\d+\.\s+/.test(line))
      .map((line) => line.replace(/^\d+\.\s+/, "").trim());

   return Array.from(new Set(names));
}