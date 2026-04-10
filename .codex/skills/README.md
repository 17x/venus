# Venus Team Skills

This directory is the monorepo source of truth for shared Codex skills.

## Best-Practice Split

- Team skills:
  - live in this repo under `.codex/skills/*`
  - are versioned and code-reviewed
  - are synced into each developer's local Codex home
- Personal skills:
  - live only in local `~/.codex/skills`
  - are not committed to the repository

## Sync To Local Codex

From repo root:

```sh
./tooling/codex/install-team-skills.sh
```

Use `--force` to overwrite existing local skill copies.

Restart Codex after syncing.
