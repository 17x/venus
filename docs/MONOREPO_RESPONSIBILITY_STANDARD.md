# Venus Monorepo Responsibility Standard

Status: Active, mandatory
Version: 1.2.0
Owner: Repository governance

## 1. Purpose and Scope

This standard defines ownership boundaries for `lib`, `engine`, `editor-primitive`, and `app` in the Venus monorepo, and the decision rules for when to implement locally in an app versus when to extract into a global package.

Applies to:

- New feature delivery
- Refactors and module migrations
- Cross-app reuse planning
- AI-assisted code changes

## 2. Dependency Topology (Not a Single Chain)

The relationship is a directed acyclic graph (DAG), not a single linear chain.

Allowed dependency edges:

- `app -> editor-primitive`
- `app -> engine`
- `app -> lib`
- `editor-primitive -> lib`
- `engine -> lib`

Forbidden dependency edges:

- Any reverse edge from lower layer to higher layer
- Any private deep import across package boundaries (for example `*/src/*` internals)
- `editor-primitive -> engine` direct package dependency (use app adapter contracts instead)

Hard constraints:

- No reverse dependency.
- No cross-layer private implementation access.
- Each layer only owns its own responsibility and must not absorb product policy from upper layers.

## 3. Layer Responsibilities

### 3.1 lib

Role: foundational capabilities reusable across products and engines.

Should contain:

- Generic data structures and low-coupling algorithms
- Domain-agnostic utility contracts (type-level and pure functional helpers)
- Stable protocol-level primitives reusable across modules

Should not contain:

- Rendering strategy
- Editor interaction semantics
- Product-specific rules

### 3.2 engine

Role: graphics and geometry mechanism owner.

Should contain:

- Render, hit-test, geometry, math, spatial indexing
- High-performance drawing and query mechanisms
- Product-agnostic optimization mechanisms for rendering/query paths

Should not contain:

- Product interaction policy (for example app-specific snapping, permissions, workflow logic)
- React/UI orchestration
- App-level command semantics

### 3.3 editor-primitive

Role: reusable editor-domain primitives that bridge mechanism capabilities and editor semantics.

Should contain:

- Cross-app editor primitives (for example selection/transform/command primitives)
- Interaction building blocks that are not tied to one product policy
- Editor-semantic modules that do not bind to a specific app shell

Should not contain:

- Single-product business flows
- Page-level UI composition
- Logic tightly coupled to one app's local data model

### 3.4 app

Role: product owner layer (business behavior and user experience).

Should contain:

- Product rules, permissions, workflows, IA
- Page and component composition
- Local state orchestration and product experiments
- Features required by only that app

Should not contain:

- Stable capabilities that are already reusable across apps (must evaluate extraction)
- Duplicated engine mechanism implementations

## 4. Local Implementation vs Global Extraction

### 4.1 Default Policy

Start in `app` by default, then extract upward only when extraction triggers are met.

Why:

- Validate requirement stability before abstraction
- Reduce global API design risk

### 4.2 Keep in app (any one condition is enough)

- Clearly product-specific behavior with no realistic cross-app reuse
- Requirement still unstable (high change frequency across the next 2-3 iterations)
- Strong coupling to app page structure, product context, or local state graph
- Extraction adds abstraction cost without meaningful reuse gain

### 4.3 Extract to global package (at least 2 conditions)

- Similar implementation exists (or is planned) in at least 2 apps
- API semantics are stable (only minor changes across 2 iterations)
- Extraction materially reduces duplication and behavior drift risk
- Extraction improves boundaries and enables independent tests
- A hot path needs unified optimization and shared regression baselines

### 4.4 Target layer after extraction

- Extract to `lib`: fully generic, no editor semantics
- Extract to `engine`: render/geometry/query mechanism ownership
- Extract to `editor-primitive`: reusable editor semantics without product policy

## 5. Decision Matrix (Operational)

1. Does the logic encode product/business policy?

- Yes: put it in `app`.
- No: continue.

2. Is it a render/hit-test/geometry/math/spatial mechanism?

- Yes: put it in `engine`.
- No: continue.

3. Is it an editor-domain primitive reusable across apps?

- Yes: put it in `editor-primitive`.
- No: continue.

4. Is it editor-agnostic foundational capability?

- Yes: put it in `lib`.
- No: keep in `app` first and re-evaluate after stabilization.

## 6. File Split Placement by Layer Ownership

### 6.1 File Split Placement Matrix (By Ownership)

Use this matrix when one large file must be split and each part needs a clear destination layer.

| Split unit signal                                                                                                    | Owns what                  | Target layer       |
| -------------------------------------------------------------------------------------------------------------------- | -------------------------- | ------------------ |
| Generic data structure/type utility/pure helper with no editor semantics                                             | Cross-domain foundation    | `lib`              |
| Render pipeline, geometry math, hit-test, spatial query, frame planning                                              | Graphics mechanism         | `engine`           |
| Reusable editor primitives (selection/transform/command primitives), editor semantic adapters without product policy | Cross-app editor semantics | `editor-primitive` |
| Product workflow, permission rule, page composition, app-only state orchestration                                    | Product behavior and UX    | `app`              |

Split placement guardrails:

- If a split unit still mixes mechanism and product policy, split again before moving.
- If a split unit depends on app-local state shape, it cannot be extracted to `lib`/`engine`/`editor-primitive` yet.
- If in doubt, keep the unit in `app` and add explicit extraction triggers.

### 6.2 File Split Placement Procedure (3 Steps)

1. Tag each code block in the source file:

- `foundation`, `mechanism`, `editor-semantic`, or `product-policy`.

2. Group blocks by tag and extract into one module per responsibility:

- Do not split by line count only.

3. Place each new module with the matrix:

- `foundation -> lib`
- `mechanism -> engine`
- `editor-semantic -> editor-primitive`
- `product-policy -> app`
- Then remove old mixed logic in the same change.

## 7. Extraction Workflow (Standard Migration Steps)

1. Stabilize in app first:

- Freeze input/output contract
- Add minimal tests (contract, determinism, boundary)

2. Design global API:

- Expose the smallest public surface
- Do not leak app-private types

3. Migrate and replace:

- Introduce package capability first
- Remove old app implementation immediately after adoption (no long-lived parallel tracks)

4. Validate:

- typecheck + lint + tests
- Add snapshot/benchmark coverage where output or performance is critical

5. Synchronize docs:

- Update this standard if rules changed
- Record why extraction happened and why the chosen target layer is correct

## 8. Anti-Patterns (Forbidden)

- Putting product policy branches in `engine`
- Re-implementing engine mechanisms inside `app`
- Importing private internals via deep paths across packages
- Keeping parallel long-lived implementations (`v2/new/temp`)
- Extracting too early and creating complex APIs without concrete reuse value

## 9. Change Requirements (Aligned with Highest Standard)

Any change that affects layer boundaries must include:

- Why the target layer was selected (based on Sections 4, 5, and 6)
- Cleanup plan (when and how old logic is removed)
- Validation evidence (typecheck, lint, tests)

If ownership is ambiguous, use the conservative rule: keep it in `app` first and log explicit extraction triggers.
