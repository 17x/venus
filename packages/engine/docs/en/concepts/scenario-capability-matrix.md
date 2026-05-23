# Scenario Capability Matrix

## Purpose

This matrix defines how 13 target scenarios are assembled from generic engine runtime capabilities without embedding product semantics.

Hard constraints:

- 3D-first default runtime baseline
- 2D is explicit opt-in only
- domain-semantic neutrality
- API-first exposure with concise naming

## Capability Domains

- C1: Scene and graph runtime
- C2: Spatial query and picking
- C3: Camera and view orchestration
- C4: Render planning and extraction
- C5: GPU execution and backend fallback
- C6: Resource graph and residency
- C7: Streaming and progressive refinement
- C8: Frame budget and pressure arbitration
- C9: Interaction and tool runtime
- C10: Timeline and replay runtime
- C11: Volume and 3D field runtime
- C12: Multi-viewport and composition surfaces
- C13: Platform and headless adapters
- C14: Observability and diagnostics
- C15: 2D opt-in module group (explicit)

## Layer Owner Legend

- B: backend
- K: kernel
- O: optimization
- R: orchestration
- P: platform

## Scenario Mapping

| Scenario                       | Required Capability Domains             | Primary Owners | Notes                                                                    |
| ------------------------------ | --------------------------------------- | -------------- | ------------------------------------------------------------------------ |
| S1 Medical CT/MRI              | C1 C3 C4 C5 C6 C7 C8 C11 C12 C14        | K R B O        | Volume and slice paths are generic field runtime capabilities.           |
| S2 Surgical planning           | C1 C2 C3 C4 C8 C9 C10 C14               | K R O          | Uses generic path, constraint, and replay primitives.                    |
| S3 BIM review                  | C1 C2 C3 C4 C5 C6 C7 C8 C12 C14         | K R B O        | Large assembly is handled by visibility, extraction, and streaming.      |
| S4 Industrial CAD              | C1 C2 C3 C4 C6 C8 C9 C12 C14            | K R O          | Constraint checks remain generic validation channels.                    |
| S5 GIS 2D/3D                   | C1 C2 C3 C4 C5 C6 C7 C8 C12 C13 C14 C15 | K R B O P      | 3D core remains default; 2D map overlays require explicit C15 opt-in.    |
| S6 Driving twin replay         | C1 C3 C4 C7 C8 C10 C12 C13 C14          | K R O P        | Timeline and replay are runtime primitives, not product logic.           |
| S7 City twin wall              | C1 C3 C4 C5 C6 C7 C8 C10 C12 C13 C14    | K R B O P      | Multi-view wall uses composition surfaces and shared residency policies. |
| S8 Commerce 3D                 | C1 C3 C4 C5 C6 C8 C12 C14               | K R B O        | Variant transitions are graph primitives with neutral naming.            |
| S9 Molecular and volume        | C1 C2 C3 C4 C5 C6 C8 C11 C12 C14        | K R B O        | Molecular rendering composes generic field and spatial capabilities.     |
| S10 Game editor/runtime parity | C1 C2 C3 C4 C5 C6 C8 C9 C10 C12 C13 C14 | K R B O P      | Authoring-runtime parity is achieved by API-level composition only.      |
| S11 Node rendering             | C1 C4 C5 C6 C8 C10 C13 C14              | K R B P O      | Node execution uses headless adapters and deterministic frame output.    |
| S12 2D vector editor           | C1 C2 C3 C4 C6 C8 C9 C12 C14 C15        | K R O          | 2D path is explicit opt-in module group; no default 2D coupling.         |
| S13 Video editor               | C1 C3 C4 C5 C6 C7 C8 C10 C12 C13 C14    | K R B O P      | Timeline monitor effects are composition and scheduling primitives.      |

## API Surface Rules for This Matrix

- Each capability domain must map to governed engine APIs first.
- No scenario may require direct deep-module imports outside API contracts.
- API names must be concise and scenario-neutral.
- New domains must justify ownership under B K O R P before implementation.
