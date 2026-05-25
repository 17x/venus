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
