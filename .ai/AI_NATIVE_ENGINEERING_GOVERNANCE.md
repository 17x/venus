# AI-Native Engineering Governance

Status: Active
Scope: Cross-project, reusable governance baseline
Owner: Repository governance

## 0. Positioning

This document is the highest-level AI governance charter in this repository.
It defines how AI should make decisions before implementation details.

Priority order:

1. This charter
2. Repository hard enforcement standards
3. Module or app local rules
4. General best practices

Conflict rule:

- Use the stricter rule.
- If ambiguity remains, prefer minimal safe mutation and document assumptions.

## 1. Core Objective

AI must optimize for long-term evolvability, not short-term local completion.

Primary system outcomes:

- Stable ownership
- Stable dependency direction
- Stable semantics
- Controlled entropy growth

## 2. Portable Governance Principles

1. Prefer extension over creation.
2. Prefer consolidation over abstraction.
3. Keep ownership singular and explicit.
4. Treat every dependency as architectural gravity.
5. Tolerate small duplication when abstraction is unstable.
6. Keep related logic spatially close.
7. Resist speculative future-proofing.
8. Behave as a long-term maintainer, not a task finisher.

## 3. AI Execution Protocol

AI must follow this sequence for non-trivial tasks:

1. Load governance context.
2. Define scope and mutation radius.
3. Confirm ownership and dependency boundaries.
4. Search extension points before creating files or abstractions.
5. Implement minimal change.
6. Remove replaced paths (cleanup-first).
7. Validate by typecheck/lint/tests for touched scope.
8. Self-review architectural and entropy impact.

## 4. Structural Governance

### 4.1 Ownership

- Every mutable state path must have one clear owner.
- AI must not bypass owner authority through hidden side paths.

### 4.2 Dependency Direction

- Dependency graph must be directional and acyclic by policy.
- Reverse dependencies and private deep-boundary imports are forbidden.

### 4.3 Mutation Radius

Before implementation, AI must declare:

- Affected domains
- Authorized modules
- Forbidden modules
- Expected impact

Silent scope expansion is forbidden.

## 5. Semantic Governance

### 5.1 Naming Stability

Avoid inflationary names unless explicitly justified:

- manager
- helper
- util
- wrapper
- facade
- common
- shared
- base

Prefer names that express domain authority and behavior.

### 5.2 Abstraction Governance

Forbidden by default:

- Wrapper around wrapper
- Pass-through orchestration without ownership or transformation
- Premature generic frameworks

Rule of three guidance:

- Abstract only after repeated stable patterns are proven.

## 6. File and Module Governance

- Do not split files for aesthetic cleanliness only.
- One-function files are discouraged unless ownership/lifecycle requires separation.
- Use responsibility boundaries for splits, not arbitrary length chunks.
- Keep public behavior stable unless change intent explicitly states otherwise.

## 7. Temporary and Compatibility Logic

Every temporary workaround, compatibility branch, or diagnostic guard must include:

`AI-TEMP: <why>; remove when <condition>; ref <task/doc>`

No unlabeled long-lived temporary logic.

## 8. Enforcement and Validation

Minimum merge gate for touched scope:

- Typecheck
- Lint
- Relevant tests

Any failed gate blocks further feature mutation until fixed.

## 9. Self-Review and Decision Logging

For structural changes, AI must log:

- Why modification was insufficient
- Why new file/module/dependency was necessary
- What entropy risk was introduced
- What cleanup removed old complexity

Entropy checklist:

- Abstraction depth increased?
- Wrapper/orchestration layers increased?
- Semantic duplication introduced?
- Coupling increased?
- Ownership clarity reduced?

## 10. Portability Profile

This charter is intentionally framework-agnostic and project-type agnostic.
Repository-specific enforcement must live in dedicated enforcement docs and must not weaken this charter.

## 11. Agent Compatibility Contract

This charter is binding for all AI agents that can mutate repository state, including:

- IDE assistants
- CLI coding agents
- CI/autofix agents
- Review/refactor agents
- Scripted batch agents

Agent-agnostic rule:

- Differences in tool interfaces do not change governance obligations.
- If an agent cannot satisfy a required step, it must stop mutation and report the blocker.

## 12. Capability Tiers and Required Behavior

Agents must classify themselves per task into one of three tiers:

1. Tier A (Full): can read, edit, run validation commands.
2. Tier B (Edit-only): can read/edit but cannot run commands.
3. Tier C (Read-only): can analyze/review but cannot edit.

Required behavior by tier:

- Tier A: must execute full protocol and provide validation evidence.
- Tier B: must execute all non-runtime steps, provide exact validation commands for a Tier A runner, and mark result as unverified.
- Tier C: must provide findings and exact mutation plan only; no implementation claims.

## 13. Evidence and Traceability Contract

For each non-trivial change, the agent must emit evidence fields in handoff:

- Scope statement
- Mutation list (files/areas changed)
- Validation commands run (or explicitly not runnable)
- Validation outcome summary
- Cleanup summary (what was removed)
- Residual risks and follow-up actions

Claims without evidence are invalid.

## 14. Exception and Escalation Protocol

If governance cannot be fully satisfied, use explicit exception record:

`[GOV-EXCEPTION] <rule>; <why blocked>; <risk>; <fallback>; <owner>; <expiry>`

Rules:

- Exception must be narrow and time-bounded.
- Exception cannot silently downgrade safety-critical validation.
- Expired exceptions must be removed or renewed with new rationale.

## 15. Context Budget and Degradation Control

To prevent low-context errors across agent implementations:

- Prefer scoped reads before broad scans.
- Summarize and checkpoint key decisions before large edit batches.
- Reconstruct task state from governance docs and task docs before resuming after interruption.
- When context uncertainty is high, reduce mutation radius or stop and request clarification.

## 16. Security and Secret Handling Baseline

- Never expose secrets, tokens, credentials, or private keys in logs, patches, or summaries.
- Never request users to paste secrets into persisted files.
- Redact sensitive values in diagnostic output.
- Prefer least-privilege commands and minimal filesystem mutation.

## 17. Multi-Agent Concurrency Safety

When multiple agents may touch the same repository:

- Re-read target files immediately before patching.
- Do not revert unrelated changes.
- If conflicting concurrent edits are detected in target scope, stop and surface the conflict.
- Keep changes atomic and scoped to one intent per patch batch.

## 18. Definition of Done (Universal)

A task is complete only if all are true:

1. Governance protocol steps were followed for the agent tier.
2. Scope stayed within declared mutation radius.
3. Cleanup-first rule was satisfied.
4. Validation evidence was provided (or explicitly delegated with commands).
5. Residual risk is documented.
6. No unresolved governance exception remains past expiry.

## 19. Governance Lifecycle

- Version root governance documents.
- Every governance change must include rationale and compatibility impact.
- Local governance may tighten rules but may not weaken this charter.
- Task documents (.ai-tasks) are operational state, not governance authority.

## 20. Machine-Readable Baseline

Machine-readable governance rules are defined in:

- `.ai/GOVERNANCE_MACHINE_RULES.yaml`

Usage intent:

- Drive automated policy checks in CI or local guard tools.
- Keep rule semantics aligned with this charter.
- If machine-readable and human-readable rules diverge, this charter is authoritative and the machine rules must be updated in the same change.

## 21. Entropy Governance (Global)

AI-driven repositories naturally accumulate entropy over time. Entropy control is mandatory.

Entropy signals to monitor:

- Wrapper depth growth
- Duplicate abstractions for same responsibility
- Naming drift and semantic inflation
- Rising file fragmentation with low ownership clarity
- Validation bypass frequency (`UNVERIFIED`, exceptions)

Mandatory anti-entropy controls:

1. Every feature/refactor change must remove replaced paths in the same batch.
2. Repeated local patterns must be consolidated only after stability is proven.
3. New modules/files must declare ownership boundary and why extension was insufficient.
4. Deprecated paths must have explicit retirement condition and owner.
5. Governance exceptions must be time-bounded and tracked to closure.

Entropy budget policy:

- Any change that increases abstraction/wrapper depth must include compensating simplification, or be blocked.
- Any change that introduces parallel implementation tracks without explicit migration plan is blocked.
- Any increase in unresolved temporary logic (`AI-TEMP`) requires an explicit burn-down plan.

Maintenance cadence:

- Run release-loop governance checks at milestone/handoff.
- Run periodic repository cleanup passes to remove stale scripts/docs/rules.
- Update governance docs whenever structural policy changes.
