[CHANGE REQUEST]

Target:

- File / Module:
  - packages/engine/src/api/createEngine.ts
  - packages/engine/src/api/createEngine.runtime-plan-scheduler.foundation.ts

Goal:

- Problem being solved:
  - Extract runtime planning and scheduler helper cluster to reduce createEngine.ts while preserving planning/scheduling behavior.

Change Type:

- Modify
- Add

Impact:

- Affected modules:
  - packages/engine/src/api/createEngine.ts
  - packages/engine/src/api/createEngine.runtime.facade.ts (indirect wiring only)

Cleanup:

- Old logic to remove:
  - Inline helpers in createEngine.ts:
    - createRuntimeFramePlan
    - createRuntimeVisibilityPlan
    - createRuntimeLodPlan
    - createRuntimeRoiPlan
    - createRuntimeBudgetPlan
    - inspectRuntimePlan
    - createRuntimePlanScheduler
    - ensureRuntimePlanScheduler
    - requestRuntimePlanFrame
    - cancelRuntimePlanFrame
    - setRuntimePlanInteractiveInterval
    - resolveRuntimePlanSchedulerDiagnostics
    - disposeRuntimePlanScheduler

Tests:

- Tests to add/update:
  - No behavior changes intended; validate with strict typecheck and file-shape gates.
