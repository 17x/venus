# T0019 Capability-Aware Policy Resolver

Status: In Progress

## Inputs

- device capability profile
- profile default preset
- settings override

## Rules

- low-tier devices clamp expensive defaults
- high-tier devices can raise quality caps
- resolver is deterministic for same input tuple

## Acceptance

- capability matrix tests pass.
