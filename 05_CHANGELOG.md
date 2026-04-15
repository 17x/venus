# Changelog

## 2026-04-15

- Added root documentation governance files:
  - `00_README.md`
  - `STATE.md`
  - `04_DECISIONS.md`
  - `05_CHANGELOG.md`
  - `06_TODO.md`
- Introduced canonical docs map at `docs/index.md`.
- Created new documentation domains:
  - `docs/product/*`
  - `docs/architecture/*`
  - `docs/engineering/*`
  - `docs/ai/*`
  - `docs/decisions/*`
- Renamed and relocated old docs:
  - `docs/00-Docs-Home.md` -> `docs/index.md`
  - `docs/architecture.md` -> `docs/architecture/overview.md`
  - `docs/runtime-engine-responsibility-split.md` -> `docs/architecture/layering.md`
  - `docs/runtime-mindmap-guide.md` -> `docs/architecture/runtime.md`
- Added ADR records for architecture boundary and documentation governance.
- Normalized `docs/task/plan-2.md` from mixed mega-plan into execution-plan scope.
- Normalized `docs/task/plan-1.md` from mixed mega-plan into execution-plan scope.
- Synced plan routing deltas into `STATE.md` and `06_TODO.md`.
- Added task-plan navigation entries in `docs/index.md`.
- Added workflow `Workflow E: Large Plan Normalization` in `docs/ai/workflows.md`.
- Started runtime decomposition development by extracting shape action dispatch
  from `useEditorRuntime.ts` into
  `apps/vector-editor-web/src/hooks/runtime/shapeActions.ts`.
