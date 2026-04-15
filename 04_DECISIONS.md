# Decision Summary

## D-001 Runtime Layer Boundary

- Decision: keep mechanism in `@venus/engine`, policy in runtime family, product behavior in app layers.
- Why: avoid ownership drift and long-term coupling.
- Alternatives rejected:
  - move product interaction policy into engine
  - let app layer bypass runtime and mutate engine/worker internals
- Impact: architecture docs, worker/runtime protocol evolution, review checklist.
- Reference: `docs/decisions/ADR-001-runtime-layer-boundary.md`

## D-002 Documentation Governance Baseline

- Decision: adopt root-state + docs domain map (`product`, `architecture`, `engineering`, `ai`, `decisions`) as canonical documentation structure.
- Why: improve multi-person and AI handoff speed, reduce drift and duplicated knowledge.
- Alternatives rejected:
  - single overloaded README workflow
  - unstructured ad-hoc notes as primary source
- Impact: docs routing and update workflow, session handoff path.
- Reference: `docs/decisions/ADR-002-documentation-governance.md`
