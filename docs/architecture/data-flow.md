# Data Flow

## Command Flow

1. App emits command intent.
2. Runtime dispatches typed command to worker.
3. Worker mutates scene/document state and records history.
4. Runtime receives updated snapshot/state flags.
5. Renderer redraws from snapshot + viewport.

## Interaction Flow

1. Viewport captures pointer and wheel input.
2. Runtime interaction logic resolves gesture/session state.
3. Worker and engine hit-test/selection paths resolve target candidates.
4. Runtime publishes interaction state for overlay and command decisions.

## Viewport Flow

1. Input updates pan/zoom state.
2. Runtime recalculates viewport matrices.
3. Renderer uses viewport transform for draw.

## File Flow

1. App-level file adapter loads source format.
2. Adapter converts into runtime-consumable document model.
3. Runtime/worker execute editing and mutation flow.
4. Export path serializes through document/file adapters.
