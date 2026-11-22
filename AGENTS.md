# Venus Agent Guide

Read [AI/RULES.md](./AI/RULES.md) before making non-trivial changes.

## Scope

- Change one app or one package per task by default.
- Related tests and documentation in that same scope are included.
- Do not change multiple apps/packages unless the user explicitly requests a
  repository-wide or global refactor.
- If a contract change forces another workspace change, explain the dependency
  and ask before expanding scope unless global authorization already exists.
- Root documentation and configuration may change when they directly describe
  the authorized scope.

## Working tree

- Preserve unrelated and uncommitted user changes.
- Prefer the smallest complete change; do not leave parallel implementations.
- Validate the affected scope before handoff.
