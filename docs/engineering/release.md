# Release

## Release Checklist

1. Confirm high-priority TODO items and blocker status in `../../06_TODO.md`.
2. Confirm state summary is current in `../../STATE.md`.
3. Run validation baseline:
   - `pnpm typecheck`
   - `pnpm lint`
   - `pnpm build`
4. Record meaningful release deltas in `../../05_CHANGELOG.md`.
5. If decisions changed, update `../../04_DECISIONS.md` and related ADR.

## Release Notes Scope

- Include user-facing behavior changes
- Include architecture-impacting changes
- Avoid dumping full implementation details
