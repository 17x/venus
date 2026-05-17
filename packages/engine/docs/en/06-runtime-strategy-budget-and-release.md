# Runtime Strategy Budget And Release

## 1. Runtime Domain Goal

Runtime is the orchestration center that turns scene + interaction + renderer capabilities into stable frame behavior.

## 2. Core Runtime Areas

1. `runtime/createEngine`

- Engine composition entrypoint and lifecycle control.

2. `runtime/createEngineLoop`

- Loop ticking and render trigger semantics.

3. `runtime/renderScheduler`

- Request coalescing, policy-aware scheduling.

4. `runtime/strategy`

- Phase classification, convergence, degradation ladder, QoS decisions.

5. `runtime/budget`

- Pressure sampling, upload broker, worker budget broker.

6. `runtime/policy`

- Runtime profile policy packs, scaler, scenario policies, camera and cache policy.

7. `runtime/diagnostics`

- Determinism, blank-frame, sharpen-SLA, memory/cache, regression checks.

8. `runtime/release`

- Acceptance and readiness contracts (phase gates, governance checklists, rollout/runbook policies).

9. `runtime/bridge`

- Layered-bridge compatibility wiring between runtime and renderer outputs.

## 3. Strategy-To-Render Contract

1. Runtime resolves phase and budget context.
2. Context is wired into renderer frame context.
3. Renderer returns stats + fallback taxonomy.
4. Runtime updates diagnostics and release gating signals.

## 4. Operational Limits

1. Runtime must orchestrate but not reimplement renderer internals.
2. Policy modules should remain deterministic and contract-driven.
3. Release contracts are governance checks, not direct draw-path owners.

## 5. Integration With Settings

Settings domain (`settings/*`) controls default bundles and migration compatibility for:

1. Graphics and performance baselines.
2. Preset/profile selection.
3. Runtime budget and diagnostics defaults.

Runtime consumes resolved settings snapshots and should avoid ad-hoc policy literals.
