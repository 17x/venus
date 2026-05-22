# App Adapter Migration Guide

This guide describes how app/domain adapters should migrate to the canonical engine API surface.

## Migration Goal

Move from compat-oriented integration to capability-oriented integration without leaking product semantics into engine APIs.

## Step-by-Step Migration

1. Inventory current adapter calls

- List all current engine touchpoints.
- Mark compat-only APIs.

2. Map to canonical namespaces

- `engine.*` for default app integration.
- `engine.capability.*` for capability composition.
- `engine.runtime.*` only when execution-level control is required.

3. Normalize product input

- Convert domain model into normalized graph.
- Convert interaction state into overlay/annotation/transform-preview payload.

4. Replace compat aliases

- Remove temporary aliases and direct legacy dependencies.
- Validate imports use canonical surface only.

5. Align event handling

- Replace ad-hoc callbacks with typed event subscriptions.
- Ensure error paths subscribe to diagnostics events.

6. Validate deterministic paths

- Verify timeline/simulation/replay behavior under target backend profiles.

## Mapping Examples

| Legacy pattern               | Canonical replacement                 |
| ---------------------------- | ------------------------------------- |
| `compat.setScene(data)`      | `engine.setGraph(graph)`              |
| `compat.patchScene(delta)`   | `engine.updateGraph(patch)`           |
| `compat.hitTest(point)`      | `engine.pick(point, options)`         |
| `compat.previewTransform(p)` | `engine.setTransformPreview(preview)` |

## Required Regression Coverage

1. Hover/selection visual parity.
2. Overlay consistency across backends.
3. Pick ordering determinism.
4. Headless snapshot and replay parity.

## Canonical Readiness Criteria

- No compat-only imports in adapter runtime.
- All adapter calls route through canonical APIs.
- EN/CN docs and tests aligned with final call surface.
