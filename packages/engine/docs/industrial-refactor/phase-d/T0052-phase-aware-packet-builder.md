# T0052 Phase-Aware Packet Builder

Status: in-progress
Owner: engine/runtime

## Scope

- Split packet builder responsibilities by stage.
- Preserve critical-layer packets under budget pressure.
- Clip non-critical packets by phase-aware budget rules.

## Acceptance

- Packet build stays bounded and keeps critical layers intact.

## Validation

- Packet snapshot regression tests.
