# Matrix-First Runtime Transform RFC (Phase 5)

Status: Draft
Date: 2026-04-09
Scope: `document-core`, `canvas-base`, `editor-worker`, renderer/shared-memory

## Context

Current runtime nodes are decomposed:

- `x/y/width/height/rotation/flipX/flipY`

Matrix helpers already exist and are shared broadly, but matrix data is not yet
the primary runtime transform representation.

## Problem

- Runtime transform behavior is largely unified, but decomposed storage still
  requires compatibility adapters and careful normalization across package
  boundaries.
- Long-term transform evolution (e.g., richer local/world transform pipelines)
  is constrained when matrix data is treated only as derived state.

## Goals

- Introduce a matrix-first runtime transform contract for active runtime paths.
- Preserve backward compatibility during migration by keeping decomposed adapters.
- Keep file-format truth unchanged (`node + feature` model remains canonical).

## Non-Goals

- This RFC does not change persisted file-format semantics.
- This RFC does not immediately remove legacy decomposed fields everywhere.

## Proposed Contract

Phase-5 scaffold introduced in `document-core`:

- `MatrixFirstNodeTransform`
- `createMatrixFirstNodeTransform(source: BoxTransformSource)`
- `toLegacyShapeTransformRecord(transform: MatrixFirstNodeTransform subset)`

These APIs allow packages to migrate call sites to matrix-first payloads while
still adapting to legacy consumers.

## Migration Plan

1. Adopt matrix-first payloads at package boundaries (`canvas-base` interaction
   sessions, worker protocol internals) while retaining legacy adapters.
2. Shift worker/runtime mutation internals to consume matrix-first payloads in
   transform-sensitive paths.
3. Evaluate shared-memory geometry contract updates for matrix-first snapshots
   (or explicit projection adapter layer) without breaking renderer consumers.
4. Remove redundant legacy transform reconstruction paths once all active
   consumers are matrix-first.

## Compatibility

- Legacy runtime fields remain supported during migration.
- Adapters stay in `document-core` to avoid package-local conversion drift.
- `pnpm matrix:check` remains the required regression gate per migration slice.

## Risks

- Incomplete dual-path migration could create transform drift between matrix and
  legacy adapters.
- Shared-memory and renderer contract changes need careful sequencing.

## Acceptance Criteria

- Active runtime transform-sensitive packages consume matrix-first contracts at
  their internal boundaries.
- Legacy adapters remain centralized in `document-core`.
- Matrix regression scenarios remain green via `pnpm matrix:check`.
