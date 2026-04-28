# AI Changelog

Tracks AI-authored structural, governance, and workflow changes that are useful
for auditability and future agent handoff.

## Entry Format

- Date
- Scope
- Why the change matters
- Key files

## 2026-04-27

- Scope: bootstrap reusable `@venus/lib` and `@venus/editor-primitive` packages
- Why: establishes the new shared low-level and editor-interaction package surfaces so future package and app work can depend on explicit stable roots
- Key files:
  - `packages/lib/package.json`
  - `packages/lib/tsconfig.json`
  - `packages/lib/src/index.ts`
  - `packages/editor-primitive/package.json`
  - `packages/editor-primitive/tsconfig.json`
  - `packages/editor-primitive/src/index.ts`
  - `packages/README.md`
  - `tsconfig.base.json`
  - `tsconfig.json`

- Scope: expand `@venus/lib` into documented module layout and extract shared utilities
- Why: aligns implementation with repository package architecture so math/worker/scheduler/id/patch primitives are owned by `@venus/lib` and reused by engine/vector surfaces through package boundaries
- Key files:
  - `packages/lib/src/*`
  - `packages/lib/README.md`
  - `packages/engine/src/math/matrix.ts`
  - `packages/engine/src/worker/capabilities.ts`
  - `packages/engine/src/runtime/renderScheduler.ts`
  - `apps/vector-editor-web/src/model/nid.ts`
  - `apps/vector-editor-web/src/editor/runtime-local/worker/scope/patchBatch.ts`
  - `packages/engine/package.json`
  - `apps/vector-editor-web/package.json`

- Scope: second-batch extraction to `@venus/lib/viewport` plus repo validation cleanup
- Why: centralizes viewport/pan/zoom primitives in `@venus/lib`, preserves engine compatibility via re-export adapters, and restores green workspace validation after compatibility/type contract drift
- Key files:
  - `packages/lib/src/viewport/*`
  - `packages/engine/src/interaction/viewport.ts`
  - `packages/engine/src/interaction/viewportPan.ts`
  - `packages/engine/src/interaction/zoom.ts`
  - `apps/vector-editor-web/src/editor/runtime/canvasAdapter.tsx`
  - `apps/vector-editor-web/src/shared/types/lite-u-editor.d.ts`
  - `apps/vector-editor-web/tsconfig.app.json`
  - `apps/vector-editor-web/vite.config.ts`
  - `tsconfig.base.json`

- Scope: third-batch extraction of shape-transform base primitives into `@venus/lib`
- Why: centralizes affine matrix math and rotated-bounds hit testing in lib while keeping engine semantic contracts stable through compatibility wrappers
- Key files:
  - `packages/lib/src/math/affineMatrix.ts`
  - `packages/lib/src/math/affineMatrix.test.ts`
  - `packages/lib/src/geometry/rotatedBounds.ts`
  - `packages/lib/src/geometry/rotatedBounds.test.ts`
  - `packages/lib/src/math/index.ts`
  - `packages/lib/src/geometry/index.ts`
  - `packages/engine/src/interaction/shapeTransform.ts`
  - `packages/engine/src/interaction/shapeTransform.test.ts`
  - `packages/engine/src/interaction/hitTest.ts`
  - `packages/lib/README.md`

## 2026-04-25

- Scope: stricter AI documentation and comment-governance enforcement
- Why: expanded repository standards so AI edits now require function comments,
  line-level type-contract comments, explicit `AI-TEMP:` tags for temporary
  changes, and workspace-level instructions plus hook enforcement that apply
  during both direct file edits and file splits
- Key files:
  - `docs/engineering/coding-standards.md`
  - `docs/ai/project-rules.md`
  - `docs/core/code-style-checklist.md`
  - `docs/ai/handoff.md`
  - `.github/copilot-instructions.md`
  - `AGENTS.md`
  - `CLAUDE.md`
  - `.agents/skills/venus-standards-enforcer/SKILL.md`
  - `.agents/skills/venus-standards-enforcer/scripts/posttooluse-enforce.sh`

- Scope: vector product docs moved to app-local docs
- Why: keeps product-only vector documentation close to vector app code and
  reduces global docs clutter
- Key files:
  - `apps/vector-editor-web/docs/product/index.md`
  - `apps/vector-editor-web/docs/product/session-development-rules.md`
  - `apps/vector-editor-web/docs/product/doc-separation-migration-plan.md`
  - `docs/index.md`

- Scope: runtime and product-doc routing into vector app docs
- Why: moved runtime-adoption and product-facing runtime notes out of global
  `docs/` to keep global docs cross-cutting and keep vector implementation
  docs local to `apps/vector-editor-web`
- Key files:
  - `apps/vector-editor-web/docs/runtime/runtime.md`
  - `apps/vector-editor-web/docs/runtime/runtime-interaction.md`
  - `apps/vector-editor-web/docs/runtime/runtime-presets.md`
  - `apps/vector-editor-web/docs/runtime/runtime-react-legacy.md`
  - `docs/index.md`
  - `docs/packages/README.md`
  - `docs/engineering/doc-versioning.md`

- Scope: app-local and package-local documentation routing
- Why: moved vector-only and engine-only documentation out of global `docs/`
  so global docs stay cross-cutting while local ownership stays next to code
- Key files:
  - `apps/vector-editor-web/docs/architecture.md`
  - `apps/vector-editor-web/README.md`
  - `packages/engine/README.md`
  - `docs/index.md`
  - `docs/packages/README.md`
  - `docs/engineering/doc-versioning.md`

- Scope: documentation path and routing cleanup
- Why: added a stable rule that repository docs must not contain machine-local
  absolute paths, and slimmed package docs so product-specific adoption detail
  routes to app docs instead of accumulating inside package notes
- Key files:
  - `docs/engineering/doc-versioning.md`
  - `docs/ai/project-rules.md`
  - `docs/apps-vector.md`
  - `docs/packages/runtime.md`
  - `docs/packages/runtime-interaction.md`
  - `docs/packages/runtime-presets.md`
  - `docs/packages/engine.md`
  - `packages/engine/README.md`

- Scope: mandatory code comment policy
- Why: promoted the requirement that all newly written or modified code must
  carry comments into repo-level engineering and AI instruction documents, so
  the rule survives beyond the current chat session
- Key files:
  - `docs/engineering/coding-standards.md`
  - `docs/ai/project-rules.md`
  - `AGENTS.md`
  - `CLAUDE.md`

- Scope: project governance baseline
- Why: added stable AI-facing rules for boundaries, ownership, tests, and
  phased quality gates so future agent work has a durable reference beyond
  transient chat context
- Key files:
  - `docs/ai/project-rules.md`
  - `docs/decisions/ADR-003-module-boundary-and-quality-gates.md`
  - `eslint.config.js`

- Scope: engine unit-test baseline
- Why: established the first active geometry/math test slice without adding a
  new test framework dependency, so pure engine logic now has a concrete,
  runnable validation path
- Key files:
  - `packages/engine/package.json`
  - `packages/engine/src/math/matrix.test.ts`
  - `packages/engine/src/interaction/viewport.test.ts`
  - `packages/engine/src/interaction/hitTest.test.ts`
  - `docs/engineering/testing.md`
