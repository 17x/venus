# Repo Governance Preferences (Extracted, Portable)

Source basis:

- .ai/ai_native_engineering_governance_v2.md
- .ai-local/AI_HIGHEST_STANDARD.md
- .github/copilot-instructions.md
- .ai-local/rules-index.md

This file extracts high-generality preferences that can be reused in other projects.

## 1. Decision Priority Preferences

1. Long-term evolvability over local task completion.
2. Modification and consolidation over net-new abstractions.
3. Small safe duplication over unstable generic layers.

## 2. Architecture Preferences

- Ownership must be singular and explicit.
- Dependency direction must be policy-driven and non-reverse.
- Boundaries are hard constraints, not style suggestions.

## 3. Change Behavior Preferences

- Scope first, then implementation.
- No silent scope expansion.
- No opportunistic cross-system refactor unless required by correctness.
- Cleanup-first: remove replaced logic in the same change.

## 4. Semantic Preferences

- Avoid semantic inflation names (manager/helper/util/wrapper/common/shared/base).
- Prefer domain-authoritative naming over generic naming.
- Avoid pass-through wrapper chains.

## 5. File Shape Preferences

- Split by responsibility and lifecycle boundary, not visual neatness.
- Avoid micro-files and one-function files unless boundary requires.
- Large mixed-responsibility files should be split with ownership preservation.

## 6. Documentation Preferences

- Add intent comments for modified/new functions.
- Explain non-obvious branches, fallback, cache/state transition, and thresholds.
- Public type/interface changes need semantic declaration and field comments.

## 7. Temporary Logic Preferences

- Any temporary workaround must be explicitly tagged:
  - AI-TEMP: <why>; remove when <condition>; ref <task/doc>

## 8. Validation Preferences

- Typecheck + lint + relevant tests are mandatory gates for touched scope.
- Failing gates block further feature mutation.

## 9. AI Role Preferences

- AI should act as architect + implementer + reviewer + entropy controller.
- Delivery is not complete without architectural self-review.

## 10. Reuse Guidance

When transplanting these preferences to another repository:

1. Keep sections 1-3 and 8-9 unchanged as universal baseline.
2. Localize dependency rules and validation commands in enforcement docs.
3. Keep naming and file-shape constraints strict unless language/tooling forces exceptions.
