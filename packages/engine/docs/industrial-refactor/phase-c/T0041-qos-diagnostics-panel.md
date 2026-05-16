# T0041 QoS Diagnostics Panel

Status: in-progress
Owner: engine/runtime

## Scope

- Expose phase/pressure/budget/degradation in one diagnostics panel payload.
- Include fallback reason and critical-layer guard hits for every frame snapshot.

## Acceptance

- Any degradation event is traceable via diagnostics payload fields.
- Panel payload shape is deterministic across repeated runs with equivalent input.

## Validation

- Diagnostics field completeness test.
- Integration snapshot test through createEngine diagnostics path.
