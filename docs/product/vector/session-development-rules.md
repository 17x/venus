# Vector Session Development Rules

This document captures the development rules established and applied in this session for vector-editor work.

## 1) Ownership And Layering

1. Keep product behavior in vector app layer (`apps/vector-editor-web`).
2. Do not move product UI logic into engine/runtime internals.
3. Keep runtime/engine boundaries unchanged while improving vector UX behavior.

## 2) UI And Shortcut Conflict Rules

1. Global shortcuts must not trigger inside editable or interactive UI targets.
2. Shortcut handling must skip at least:
   - `input`, `textarea`, `select`, `button`, `a[href]`
   - contenteditable surfaces
   - menu-like and form-like interaction roles used by UI components
3. Respect `event.defaultPrevented` and do not re-handle blocked events.
4. Respect IME/composition input (`event.isComposing`, `Process`) and do not trigger hotkeys during composition.
5. Global shortcut handling must be gated by editor focus state.
6. Temporary space-to-pan mode must restore previous tool if editor loses focus before keyup arrives.

## 3) Text Inspector Update Rules

1. Keep direct text-content mutation blocked from inspector when current product policy requires canvas-side partial text editing.
2. Allow style-only text updates through `textRuns` for typography controls such as font family.
3. Font picker behavior should be discoverable and fast:
   - searchable list
   - preview in each font row
   - predictable fallback font list if local font query is unavailable

## 4) Type Safety And Wrapper Compatibility

1. Align app-local UI wrappers with upstream UI primitive APIs.
2. Remove unsupported props rather than forcing types.
3. Guard nullable values before coercion in select-like controls.

## 5) Migration And Dependency Hygiene

1. Keep vector imports on `@vector/ui` and avoid reintroducing `@venus/ui` usage in vector app source.
2. Audit import/dependency surfaces after migration-facing edits.

## 6) Validation Standard

After behavior changes, run all of:

1. `pnpm typecheck`
2. `pnpm --filter @venus/vector-editor-web lint`
3. `pnpm --filter @venus/vector-editor-web build`

Do not report completion until these checks pass or failures are explicitly documented.

## 7) Documentation Update Standard

For meaningful vector behavior changes:

1. Append implementation facts to `05_CHANGELOG.md`.
2. Update `docs/core/current-work.md` with current direction and landed baseline.
3. Keep entries factual: what changed, where, and why.
