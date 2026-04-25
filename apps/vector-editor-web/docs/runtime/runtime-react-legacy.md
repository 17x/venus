# Runtime React Legacy Note

Vector app local migration note for historical `@venus/runtime/react` usage.

## Status

- `@venus/runtime/react` is removed from active runtime package exports.
- Keep this note only as migration-era context for vector app maintainers.

## Stable Knowledge

- React adapter ownership now stays app-local in vector runtime bridge code.
- Runtime core remains framework-agnostic.

## Vector Maintenance Guidance

- Do not reintroduce runtime-level React ownership into runtime core packages.
- Keep React wiring inside vector app runtime bridge files.
- Keep legacy migration timeline in changelog rather than expanding this note.