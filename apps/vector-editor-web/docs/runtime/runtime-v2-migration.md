# Vector Runtime V2 Migration (UI Unchanged)

## Goal

Migrate vector worker/runtime internals toward the normalized document model from `docs/task/vector.documentNode-gpt.md` while keeping React/UI surfaces unchanged.

## Runtime Strategy

- Keep UI input/output protocol stable (`EditorRuntimeCommand`, `SceneUpdateMessage`).
- Introduce a new pure TypeScript runtime layer under `src/editor/runtime-local/document-runtime`.
- Start with read-side migration (derived group bounds), then move write-side commands.
- Maintain compatibility projection from legacy `document.shapes[]` during migration.

## UI Feature Inventory For Runtime Alignment

The following UI-facing features must remain behavior-compatible during migration.

| Feature Area | Command / Trigger | Current Status | Runtime V2 Plan |
| --- | --- | --- | --- |
| Selection | `selection.set`, pointer selection | Legacy worker path | Keep protocol stable, migrate selection source lookup to normalized graph |
| Delete | `selection.delete` | Legacy patches | Rebase remove/restore patches on normalized node ids |
| Move/Resize/Rotate | `shape.move`, `shape.resize`, `shape.rotate`, `shape.transform.batch` | Legacy geometry fields | Add local-transform adapter layer before full transform contract migration |
| Group/Ungroup | `shape.group`, `shape.ungroup` | Legacy `parentId/childIds` patches | Move to normalized parent/children canonical operations first |
| Reorder | `shape.reorder` | Legacy index-based shape array operations | Switch to sibling-order updates in normalized parent node |
| Patch style | `shape.patch`, `shape.rename`, `shape.set-clip` | Legacy node patching | Keep patch shape unchanged, remap storage to normalized node table |
| Boolean/Convert Path | `shape.boolean`, `shape.convert-to-path` | Legacy helper flow | Keep helper outputs stable, inject normalized insert/remove adapter |
| Viewport commands | `viewport.*` | Log-only/legacy runtime | No contract change required in first migration slices |
| Tool switching | `tool.select` | Log-only/legacy runtime | No contract change required in first migration slices |
| Collaboration receive | `collaboration.receive` | Legacy patch pipeline | Add normalized patch projection after local command migration |

## Implemented Slice (2026-04-28)

- Added pure TS normalized document runtime projection:
  - `src/editor/runtime-local/document-runtime/normalizedDocumentRuntime.ts`
- Added deterministic tests for normalized runtime projection and nested group-bounds derivation:
  - `src/editor/runtime-local/document-runtime/normalizedDocumentRuntime.test.ts`
- Switched group-bounds synchronization to use normalized runtime traversal:
  - `src/editor/runtime-local/worker/scope/sceneGroupBounds.ts`
- Migrated command patch planning for group/ungroup/reorder to normalized runtime helpers:
  - `src/editor/runtime-local/document-runtime/normalizedHistoryPatches.ts`
  - `src/editor/runtime-local/worker/scope/localHistoryEntry.ts`
  - `src/editor/runtime-local/worker/scope/remotePatches.ts`
- Added dual-write consistency validation diagnostics for migration-sensitive commands:
  - `src/editor/runtime-local/worker/scope/operations.ts`
- Added normalized structural apply helpers and wired scene patch application through them:
  - `src/editor/runtime-local/document-runtime/normalizedDocumentRuntime.ts`
  - `src/editor/runtime-local/worker/scope/scenePatches.ts`
- Added local-vs-remote parity tests for `shape.group` / `shape.ungroup` / `shape.reorder`:
  - `src/editor/runtime-local/worker/scope/normalizedPatchParity.test.ts`
- Upgraded dual-write diagnostics with counters and optional strict mode gate (`VENUS_RUNTIME_V2_DUAL_WRITE_STRICT=1`):
  - `src/editor/runtime-local/worker/scope/operations.ts`
- Added normalized insert/remove structural apply helpers and scene patch integration:
  - `applyNormalizedInsertShape(...)`
  - `applyNormalizedRemoveShape(...)`
  - `src/editor/runtime-local/worker/scope/scenePatches.normalizedApply.test.ts`
- Added dual-write diagnostics tests for counter updates and strict-mode mismatch throw:
  - `src/editor/runtime-local/worker/scope/operations.dualWriteDiagnostics.test.ts`
- Added worker -> runtime diagnostics threading for runtime-v2 observability:
  - `src/editor/runtime-local/worker/protocol.ts`
  - `src/editor/runtime-local/worker/scope/bindEditorWorkerScope.ts`
  - `src/editor/runtime-local/core/createCanvasRuntimeController.ts`
  - `src/runtime/events/index.ts`
  - `src/editor/hooks/useEditorRuntime.ts`
- Added focused diagnostics-threading tests for worker protocol and runtime event snapshots:
  - `src/editor/runtime-local/worker/scope/bindEditorWorkerScope.test.ts`
  - `src/runtime/events/index.test.ts`
- Added remote structural storage reconciliation so collaboration insert/remove apply paths keep canonical normalized parent/child ownership:
  - `reconcileNormalizedStructuralStorage(...)`
  - `src/editor/runtime-local/worker/scope/operations.ts`
- Expanded dual-write diagnostics scope to include insert/remove command families for local + remote migration checks:
  - `src/editor/runtime-local/worker/scope/operations.ts`
  - `src/editor/runtime-local/worker/scope/operations.dualWriteDiagnostics.test.ts`
  - `src/editor/runtime-local/worker/scope/bindEditorWorkerScope.test.ts`
- Added focused remote-apply reconciliation regression coverage for collaboration structural inserts:
  - `src/editor/runtime-local/worker/scope/operations.remoteNormalizedApply.test.ts`
- Added runtime-v2 counters in default runtime debug panel surface via runtime migration event snapshots:
  - `src/components/shell/RuntimeDebugPanel.tsx`

## Next Slices

1. Extend normalized structural tests to nested multi-parent move/reorder edge cases.
2. Add migration guard metrics for shape tree invariants at worker frame boundaries.
3. Fold runtime-v2 debug counters into alert thresholds once strict mode rollout policy is finalized.

## Completed In This Session

- [x] Step 1: `shape.group` / `shape.ungroup` patch planning moved to normalized runtime helpers.
- [x] Step 2: `shape.reorder` now emits canonical sibling-order `set-group-children` patches (with legacy reorder compatibility patches preserved).
- [x] Step 3: dual-write consistency validation hook added for local/remote `shape.group` / `shape.ungroup` / `shape.reorder` operations.
- [x] Step 4: `scenePatches` now applies structural parent/children patches through normalized runtime helpers.
- [x] Step 5: local-vs-remote parity tests added for structural migration commands.
- [x] Step 6: dual-write diagnostics now expose counters and optional strict mismatch gate.
- [x] Step 7: `insert-shape` / `remove-shape` now apply through normalized ownership helpers.
- [x] Step 8: diagnostics strict-mode and counter behavior covered by focused worker tests.
- [x] Step 9: collaboration reorder planning updated to emit canonical sibling-order patch first for remote apply.
- [x] Step 10: focused ordering regression test added for remote reorder patch sequencing.
