# T0007 Capability Profile Contract

Status: In Progress

## Capability Axes

- GPU tier: low/mid/high and backend feature bits
- Memory tier: available budget classes
- CPU/threads: worker concurrency and scheduling constraints
- Backend support: WebGL2/WebGPU/CPU fallback availability

## Resolver Contract

Input:

- device probe result
- profile preference
- preset registry defaults

Output:

- normalized capability profile
- default preset recommendation
- hard limits and guard rails

## Acceptance

- Capability output deterministically selects a default preset.
- Matrix tests validate behavior across mocked device tiers.
