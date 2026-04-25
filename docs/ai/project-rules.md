# AI Project Rules

Project-level implementation rules for AI-assisted changes.

## Purpose

This file defines the minimum governance bar for module boundaries, public API,
tests, naming, and AI-authored changes.

Apply these rules pragmatically:

- If a package or app does not own a concern, do not force that capability into it.
- If a rule is relevant to the owning module, treat it as required unless a
  stronger repo rule already covers it.

## Ownership First

Before changing code, identify the owner:

- app layer owns product behavior, UI orchestration, and user-facing flows
- runtime family owns command dispatch, history orchestration, worker protocol,
  and shared interaction policy
- engine owns render, query/hit-test, geometry, math, spatial index, and
  render-facing performance mechanisms
- document-core owns persisted document semantics and file-model truth

Do not move product policy into engine. Do not bypass runtime to mutate worker
or engine internals directly.

## P0 Rules

### Documentation Paths

Required for all repository documentation.

- Do not write local absolute filesystem paths in docs.
- Prefer repository-relative paths, package names, logical import paths, or
  doc links.
- If a code location matters, document ownership and module intent rather than
  machine-specific path prefixes.

### Code Comments

Required for all newly written or modified code.

- Every new or changed code block must include a comment that explains intent,
  behavior, or the reason the block exists.
- Do not leave fresh code uncommented, even when the logic seems simple.
- Prefer short intent comments over long prose, but comment coverage is
  mandatory.
- When touching an existing block, bring its comment coverage up to the same
  standard as part of the change.

### Package Boundary And Public API

Required when a module is reused across package or app boundaries.

- Cross-package imports must use documented public APIs only.
- Do not import another package's `src` or `dist` internals.
- Public surface should be explicit at package root or documented subpath.
- When adding a new reusable capability, define the owning package first, then
  expose the narrowest stable API that callers need.

### Command And History Contract

Required for modules that mutate persisted or collaborative state.

- Mutations must flow through a typed command or patch contract.
- History ownership must be explicit: who records, replays, and reverses state.
- UI handlers should not embed ad hoc persistence mutations.
- Command payload naming must describe user intent, not transport detail.

### Geometry And Math Unit Tests

Required for pure or near-pure logic in geometry, hit-test, matrix math,
viewport transforms, snapping, path processing, and bounds calculations.

- Tests should live with the owning module or package test surface.
- Prefer deterministic input/output cases over snapshot-only testing.
- Cover edge cases: negative size, rotation, zero area, tolerance thresholds,
  degenerate paths, and nested transforms.

### Naming And Module Shape

Required for all new code.

- Keep one concept per module unless a small barrel is clearly justified.
- Prefer semantic names over implementation trivia.
- Co-locate tests, fixtures, and helpers with the owning feature when possible.
- Do not hide ownership behind vague names like `utils`, `misc`, or `helpers`
  unless the file is truly local and small.

## P1 Rules

### ADR

Required when changing one of these:

- package boundaries or ownership
- public API shape
- command/history ownership
- long-lived workflow or governance rules

Small local refactors do not need ADRs.

### Forbidden Import Lint

Expected when a package boundary is stable enough to enforce automatically.

- Start with internal-subpath bans such as `@venus/*/src/*` and `@venus/*/dist/*`.
- Add stronger boundary bans only after existing migration debt is cleared.
- Do not enable rules that would fail broad active source areas unless the
  migration is part of the same work.

### AI Change Log

AI-authored structural or governance changes should be recorded in
`AI_CHANGELOG.md` in addition to normal project changelogs when useful for
handoff, auditing, or agent continuity.

## P2 Rules

Apply only when the owning surface exists.

### Rendering Snapshot

Use for render-owning packages or apps when visual fidelity is the behavior.

### Performance Benchmark

Use for hot paths, render loops, large-scene workflows, and geometry-heavy
algorithms where regressions matter.

### E2E

Use for user-critical workflows that cross modules or packages.

Do not add empty harnesses just to satisfy a checklist. If the package does not
own a visual or end-user flow, skip snapshot or E2E requirements.

## Review Checklist

- Do docs avoid local absolute filesystem paths?
- Does every new or modified code block include a comment?
- Is ownership clear before implementation?
- Is the public API explicit and narrow?
- Does mutating logic have a command/history contract where relevant?
- Does geometry or math logic have deterministic tests where relevant?
- Is naming specific and module scope tight?
- If the change alters boundaries or governance, was an ADR added or updated?
- If the change is AI-authored and structurally meaningful, was `AI_CHANGELOG.md` updated?
