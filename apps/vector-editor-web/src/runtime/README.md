# Runtime Folder Ownership

This folder is the app-local runtime facade and pure editor-runtime code surface.

## Responsibilities

- expose stable runtime APIs for app imports (the runtime layer, runtime subpaths)
- host framework-agnostic runtime/event/command contracts
- bridge vector product requirements onto shared runtime and worker packages

## Alias Governance

- keep runtime subpaths path mapping on `src/runtime/*` only (no long per-subpath alias lists)
- add thin facade bridge files in this folder (`engine.ts`, `worker.ts`, `shared-memory.ts`, `presets.ts`) when a new runtime subpath is needed

## Non-Responsibilities

- no React component rendering
- no app context orchestration
- no hook-owned UI state logic

## Placement Rule

- if code depends on React component lifecycle, context providers, or UI rendering, place it outside `src/runtime`
- if code is pure runtime behavior (commands, events, protocol, document/runtime adaptation), keep it in `src/runtime`

## Fusion Status

- runtime implementation is being migrated from `src/editor/runtime-local/*` to `src/runtime/*` in slices
- migrated slices (`chrome`, `cursor`, `editing-modes`, `commands`, `tools`, `hittest`, `viewport`, `zoom`) now live only under `src/runtime/*`
- engine facade ownership now lives in `src/runtime/engine.ts` with a temporary compatibility bridge retained under `src/editor/runtime-local/engine.ts`
- remaining runtime-local modules are migration backlog and should be moved in the same ownership direction

