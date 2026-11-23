# Venus UI Docs

Runnable catalog for the public `@venus/ui` and `@venus/ui/vector` entry points.
This app owns documentation, examples, and page composition only. Reusable UI
implementations and theme tokens belong in `packages/ui`.

The app stylesheet imports `@venus/ui/styles.css`; vector components load their
scoped style entry from `@venus/ui/vector`.

```sh
pnpm --filter @venus/ui-docs dev
pnpm --filter @venus/ui-docs build
```
