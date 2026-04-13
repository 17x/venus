# Venus Code Style Checklist

Use this checklist for implementation, review, and pre-merge self-check.

## 1) Naming Rules

- Use explicit, responsibility-first names.
- Avoid short clever names and opaque abbreviations.
- Prefer domain terms that already exist in nearby modules.
- Use verb-first names for command-like functions, for example: resolve, create, apply, sync.
- Use noun-first names for state/data structures, for example: RuntimeSnapshot, SelectionState.
- File names should reflect single responsibility, not generic buckets.
- Keep compatibility names explicit with suffixes such as Compat or Adapter.

## 2) File Size Rules

- Default target: keep files in the 300 to 400 line range or smaller.
- If a file crosses 400 lines and has more than one clear responsibility, split it.
- If a file crosses 500 lines, treat split as required unless it is a generated file.
- Split by responsibility, not arbitrary line count chunks.
- Keep entry/orchestration files thin and move domain logic to focused modules.

## 3) API Style Rules

- Keep public API surfaces intentional and minimal.
- Keep exported names stable and predictable.
- Prefer explicit parameter objects when arguments are likely to grow.
- Keep framework-agnostic runtime APIs free of React or UI framework dependencies.
- Separate mechanism and policy boundaries:
  engine owns mechanism, runtime owns orchestration contracts, apps own product behavior.
- For public contract changes, update inline comments with semantics and compatibility notes.
- Avoid dual APIs that do the same job unless one is clearly marked as compatibility.

## 4) Readability Rules

- Optimize for fast scanning: short functions, clear flow, low nesting.
- Add concise comments only at non-obvious points:
  complex branch intent, state transitions, algorithmic transforms, compatibility edges.
- Prefer early return over nested condition pyramids.
- Keep imports grouped and consistent with nearby file style.
- Keep local style consistent with existing code, including extension-bearing local imports when present.

## 5) Maintainability Rules

- One module should have one clear job.
- Avoid duplicated business logic across layers.
- Reuse shared helpers from existing runtime and engine modules before adding new ones.
- Do not move worker/runtime responsibilities into React state for convenience.
- Keep package entrypoints clean; export only reusable contracts.
- Prefer strict types over assertions and ignore comments.
- Keep compatibility wrappers shallow and remove dead wrappers after migration.

## 6) Layer Boundary Checks

- apps: product orchestration and UI only.
- runtime core: lifecycle, transport, viewport state, and shared contracts.
- runtime interaction: shared interaction algorithms and policies.
- runtime react: React adapters only.
- engine: geometry, hit-test, renderer mechanism, and render primitives.

## 7) Validation Checklist

- Run the smallest meaningful validation for changed scope.
- Prefer running typecheck for TypeScript changes.
- Run lint when touching style-sensitive or broad files.
- If full validation is skipped, record what was not verified.

## 8) Documentation Checklist

- For meaningful feature/behavior/architecture changes:
  update the nearest docs file under docs/packages when possible.
- If no package-level note exists, add a concise factual note in docs/core/monorepo-knowledge-base.md.
- Keep notes factual: what changed, where, and why.
