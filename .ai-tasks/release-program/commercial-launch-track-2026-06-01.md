# Commercial Launch Track (2026-06-01)

## 0. Objective

Ship a first commercial version where:

1. `@venus/vector-editor-web` can be released to paying users.
2. `@venus/engine` is officially released with complete bilingual API docs.
3. `@venus/playground` shows multiple scenario demos (MVP acceptable), with game scenario as current focus.

## 1. Folder-Based Task Governance Under `.ai-tasks`

- `engine/`: scenario-derived requirement abstraction, API-first contracts, in-engine implementation gates.
- `vector-editor/`: document model, runtime adapter boundaries, fixture/mock data contract completeness.
- `playground/`: scenario validation surfaces and dataset/interaction plans.
- `release-program/`: cross-track launch orchestration, dependencies, release checklist, go/no-go criteria.

This keeps execution aligned to architecture boundaries:

- engine remains 3D-first, explicit 2D opt-in only.
- engine keeps domain semantics neutral (no product semantics).
- vector/playground own domain and product semantics, then adapt into generic engine APIs.

## 2. Current Priority Stack

1. `vector-editor` P0: document model + initial mock data full-property coverage as executable contract.
2. `engine` P0: API-first public surface finalization + bilingual docs completion + DEX-016/017 closure.
3. `playground` P0: game scenario MVP route, fixture, adapter, interactions, deterministic checks.

## 3. Cross-Track Exit Criteria

- Vector exit:
  - Document/file/node model has full fixture coverage.
  - Initial mock data covers all declared model properties.
  - Round-trip and persistence gates are green.
- Engine exit:
  - Public API export boundary is stable and scenario-neutral.
  - No default 2D-only APIs; only explicit opt-in profile.
  - EN/CN API docs complete and consistent.
- Playground exit:
  - S1-S13 route visibility preserved.
  - S10 game route has real MVP interaction loop and deterministic smoke checks.
  - Data source, fallback, and checksum/manifest policy are explicit.

## 4. Immediate Next Milestone (M1)

- Complete vector model+mock coverage hard gate.
- Publish game scenario implementation checklist under `playground/`.
- Lock engine bilingual API docs delta list against DEX-016 and DEX-017 requirements.
