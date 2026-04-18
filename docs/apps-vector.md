# Apps Vector

## Purpose

Central settings document for vector app documentation governance.

## Scope

- Target app: `apps/vector-editor-web`
- Source folders covered by this settings doc:
  - `apps/vector-editor-web/src/ui/*`
  - `apps/vector-editor-web/src/components/*`
  - `apps/vector-editor-web/src/editor/*`

## UI System Policy

- All vector UI primitive components must be generated from shadcn base UI.
- Canonical generated location: `apps/vector-editor-web/src/components/ui/*`.
- App-facing compatibility layer location: `apps/vector-editor-web/src/ui/kit/components/ui/*`.
- When adding or updating primitives, run shadcn CLI with `base` configuration and regenerate before custom patching.
- Reuse existing generated primitives first; avoid ad-hoc primitive reimplementation.

## Update Rules

- If a vector UI primitive is added, removed, or replaced, update this doc and `apps/vector-editor-web/src/ui/README.md` in the same change.
- If shadcn base preset or alias settings change, update this doc and include the new command in changelog notes.

## Standard Commands

- Initialize base config:
  - `cd apps/vector-editor-web && pnpm dlx shadcn@latest init --template vite --base base --preset nova --yes`
- Add primitives:
  - `cd apps/vector-editor-web && pnpm dlx shadcn@latest add button input select card separator tooltip dialog dropdown-menu context-menu tabs input-group`
- Inspect setup:
  - `cd apps/vector-editor-web && pnpm dlx shadcn@latest info --json`
