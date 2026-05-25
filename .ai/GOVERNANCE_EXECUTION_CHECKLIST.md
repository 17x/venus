# Governance Execution Checklist

Status: Active
Use: Quick operational checklist for all agents

## A. Pre-Execution

- Load `.ai/AI_NATIVE_ENGINEERING_GOVERNANCE.md`.
- Load `.ai-local/AI_HIGHEST_STANDARD.md` when task is repository-local.
- Declare capability tier (A/B/C).
- Define mutation radius: affected domains, authorized modules, forbidden modules.

## B. Before Editing

- Identify extension points before creating files/abstractions.
- Confirm ownership and dependency direction constraints.
- Define validation plan for touched scope.

## C. During Editing

- Keep mutation minimal and scoped.
- Remove replaced code paths in same change (cleanup-first).
- Tag temporary logic with `AI-TEMP` format.
- Avoid speculative abstractions and wrapper stacking.

## D. Validation

Tier A:

- Run required validation gates and report outcomes.

Tier B:

- Provide exact runnable commands and mark `UNVERIFIED` for deferred gates.

Tier C:

- Do not edit; provide findings and actionable implementation plan.

## E. Handoff

- Provide evidence bundle: scope, mutations, validation, cleanup, risks.
- Include exceptions only with `[GOV-EXCEPTION]` record.
- State clearly whether result is fully verified or partially verified.

## F. Stop Conditions

Stop mutation and escalate when:

- Required governance step cannot be satisfied.
- Concurrent conflicting edits are detected in same target scope.
- Dependency/ownership rule would be violated.
- Validation indicates unresolved blocking failure.

## G. Entropy Checks (Mandatory)

- Confirm no parallel implementation track was introduced without migration plan.
- Confirm wrapper/abstraction depth did not increase without compensating simplification.
- Confirm new `AI-TEMP` entries include retirement condition and owner.
- Confirm deprecated paths are either removed or tracked with retirement plan.
