# CHANGE REQUEST — R5 file-shape public-types split (2026-05-22)

[CHANGE REQUEST]

Target:

- File / Module: packages/engine/src/api/public-types.ts

Goal:

- Problem being solved: Reduce hard-limit file-shape pressure by splitting oversized public type contracts into responsibility-scoped modules while preserving the existing public import path.

Change Type:

- Modify

Impact:

- Affected modules: packages/engine/src/api/public-types.ts and new modules under packages/engine/src/api/public-types/

Cleanup:

- Old logic to remove: Monolithic single-file type declarations in public-types.ts are replaced by barrel exports to split modules.

Tests:

- Tests to add/update: No behavioral test changes expected; validate via pnpm typecheck and pnpm governance:file-shape.
