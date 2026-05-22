[CHANGE REQUEST]

Target:

- File / Module:
  - packages/engine/src/api/createEngine.ts
  - packages/engine/src/api/createEngine.runtime-resource-observability.foundation.ts

Goal:

- Problem being solved:
  - Continue reducing createEngine.ts by extracting runtime resource residency + trace/replay helper cluster into one dedicated foundation module with behavior parity.

Change Type:

- Modify
- Add

Impact:

- Affected modules:
  - packages/engine/src/api/createEngine.ts
  - packages/engine/src/api/createEngine.runtime.facade.ts (indirect dependency wiring only)
  - packages/engine/src/api/createEngine.diagnostics-replay.facade.ts (indirect dependency wiring only)

Cleanup:

- Old logic to remove:
  - Inline helper functions in createEngine.ts for runtime resources and observability:
    - resolveRuntimeResourceResidencyOutput
    - registerRuntimeResource
    - resolveRuntimeResourceById
    - updateRuntimeResource
    - releaseRuntimeResource
    - pinRuntimeResource
    - unpinRuntimeResource
    - getRuntimeResourceResidency
    - collectRuntimeResources
    - startRuntimeTrace
    - stopRuntimeTrace
    - getRuntimeTrace
    - createRuntimeReplayToken
    - replayRuntimeToken

Tests:

- Tests to add/update:
  - No behavior changes intended; validate with strict typecheck and file-shape gate.
