# Matrix Regression Scenarios

Use this as the shared regression runbook for matrix-sensitive behavior while
runtime storage is still decomposed.

## Verification Scope

- Apps:
  - `apps/vector-editor-web`
  - `apps/playground`
- Shared runtime chain:
  - `@venus/runtime`
  - `@venus/runtime/interaction`
  - `@venus/runtime/react`
  - `@venus/runtime/worker`
  - `@venus/document-core`

## Scenario Set

### 1) Rotated Single Resize

- Setup:
  - Insert one non-group shape (rectangle/path/image).
  - Rotate to a non-right-angle value (e.g. 33deg).
- Action:
  - Drag each corner and edge resize handle.
  - Cross over center axis for both horizontal and vertical flips.
- Expected:
  - Handle-direction resize behavior follows visual rotation.
  - Flip toggles (`flipX`/`flipY`) update without geometry corruption.
  - Commit/undo/redo preserves transform state.

### 2) Multi/Group Signed-Scale Crossover

- Setup:
  - Select mixed shapes and a nested group.
- Action:
  - Resize selection/group and cross both axes.
- Expected:
  - Leaf targets update consistently (group container not treated as leaf).
  - Signed-scale crossover reflects per-shape flips as expected.
  - Selection bounds/handles remain consistent after commit.

### 3) Rotated Selection Interior Clear

- Setup:
  - Single rotated selection with visible selection box.
- Action:
  - Click inside rotated selection box empty area (not on shape geometry,
    not on handles).
- Expected:
  - Selection clears.
  - Clicking shape stroke/fill still selects as normal.

### 4) Path Fill + Hit-Test Under Transform

- Setup:
  - Closed path with fill enabled and visible alpha.
  - Include a transformed state (rotate + flip and/or resized).
- Action:
  - Verify fill render, hover, and hit behavior at interior/stroke.
- Expected:
  - Fill visibility follows fill toggle + color alpha semantics.
  - Hit-test aligns with rendered geometry.

### 5) Clip Preview + Commit Consistency

- Setup:
  - Image clipped by a closed mask shape.
- Action:
  - Transform/move the clip source during preview and commit.
- Expected:
  - Clip-bound image preview moves in-session consistently.
  - Final committed state matches preview.
  - Undo/redo keeps clip linkage behavior stable.

## Minimum Validation Commands

Run from repo root:

```sh
pnpm matrix:check
```

Equivalent underlying checks:

```sh
pnpm exec tsc -b \
  packages/document-core/tsconfig.json \
  packages/engine/tsconfig.json \
  packages/runtime/tsconfig.json \
  packages/runtime/worker/tsconfig.json \
  packages/shared-memory/tsconfig.json \
  apps/vector-editor-web/tsconfig.app.json \
  apps/playground/tsconfig.app.json \
  --pretty false
```

Optional targeted lint (acknowledge known existing hook/compiler warnings):

```sh
pnpm exec eslint apps/vector-editor-web/src/hooks/useEditorRuntime.ts apps/playground/src/App.tsx
```
