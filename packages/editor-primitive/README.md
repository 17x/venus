# @venus/editor-primitive

`@venus/editor-primitive` defines reusable editor interaction primitives.

## Responsibility

- Own package-agnostic interaction contracts and runtime helpers.
- Provide pointer/keyboard/tool/operation/hover/overlay/cursor/viewport/capture/runtime modules.
- Depend only on low-level abstractions from `@venus/lib`.

## Module Coverage

- `pointer`: pointer runtime contracts, drag threshold helpers, pointer state reducers.
- `keyboard`: modifier/key runtime contracts and keydown/keyup reducers.
- `tool`: current/temporary/effective tool contracts and resolver helpers.
- `operation`: active operation, drag/gesture, command session, lifecycle manager.
- `hover`: overlay/scene hover runtime contract and change detection helper.
- `overlay`: overlay node schema, runtime state, sorting, hit-tolerance helpers.
- `cursor`: cursor intent schema, resize mapping, runtime resolver, DOM applier.
- `viewport`: viewport interaction runtime and shared zoom preset policy.
- `capture`: pointer capture ownership runtime contract.
- `runtime`: top-level interaction runtime composition contracts.

## Tests

- Package tests run with `node:test` under `src/**/*.test.ts`.
- Run `pnpm --filter @venus/editor-primitive test`.

## Boundary

- Must not depend on app packages.
- Must not depend on engine implementation internals.
- Must not encode product document semantics, command semantics, or UI policy.

