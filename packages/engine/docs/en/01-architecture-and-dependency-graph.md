# Architecture And Dependency Graph

## 1. Positioning

`@venus/engine` is the mechanism layer for rendering, geometry, query, and scheduling primitives.

It is not responsible for:

- Product command semantics.
- History/collaboration policy.
- UI state machines.
- Tool behavior orchestration.

## 2. Ownership Domains

Top-level domains and their intent:

1. Foundation: `math`, `time`, `utils`, `types`, `geometry`, `transform`, `resource`, `platform`, `camera`, `material`, `lighting`, `assets`.
2. Scene domain: `scene`, `spatial`, `visibility`.
3. Interaction domain: `interaction`.
4. Renderer domain: `renderer`, `gpu`, `render`, `scheduler`.
5. Runtime orchestration: `runtime`, `settings`, `debug`, `bench`, `worker`, `index`, `tests`.

## 3. One-Way Dependency Rule

Authoritative dependency flow is:

1. `math|time|utils|core ->` no renderer/runtime/worker imports.
2. `scene ->` foundation only.
3. `interaction -> scene + foundation`.
4. `renderer -> interaction + scene + foundation`.
5. `runtime -> renderer + interaction + scene + foundation`.
6. `worker -> runtime + renderer + interaction + scene + foundation`.

Reverse edges are forbidden unless documented as temporary with explicit removal condition.

## 4. Runtime To Frame Pipeline

Frame lifecycle:

1. `runtime/createEngine` resolves config, policy, and orchestration handles.
2. Scene updates enter via store/patch transactions.
3. Strategy resolves phase (static, pan, zoom, settling) and budget pressure.
4. Planning builds frame candidates and optional shortlist.
5. Visibility and LOD policies filter final draw set.
6. Renderer chooses packet/tile/composite/preview path.
7. Diagnostics + fallback taxonomy are reported back to runtime.

## 5. Contract Surfaces

Public API surface is exported from:

- `packages/engine/src/index.ts`
- `packages/engine/src/index/index.ts`

Contract categories:

1. Engine instance lifecycle (`createEngine`, scheduler and viewport controls).
2. Settings/profile policy APIs.
3. Runtime strategy/budget/policy gates.
4. Renderer fallback taxonomy and compatibility diagnostics.
5. Release/readiness acceptance contracts.

## 6. Key Integration Principle

App and runtime should treat engine as deterministic mechanism:

1. App/runtime own product semantics and user intent interpretation.
2. Engine owns geometry correctness, render execution, and mechanism diagnostics.
