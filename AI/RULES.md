# AI Engineering Rules

Status: active and mandatory

These rules apply to AI-authored repository changes. Package-local instructions
may add stricter requirements.

## Workflow

For every non-trivial change:

1. Define scope and ownership.
2. Define affected contracts/types.
3. Record a change request before editing.
4. Define tests.
5. Implement and remove replaced logic.
6. Validate the affected scope.
7. Check references, dead code, and diff hygiene.

Change request:

```md
[CHANGE REQUEST]
Target:
Goal:
Change type:
Impact:
Cleanup:
Tests:
```

## Scope control

- One task changes one app or one package by default.
- Cross-workspace changes require an explicit repository-wide/global request.
- A required dependency update does not silently broaden scope: describe it and
  request approval unless global authorization already exists.
- Start product behavior in its app. Extract only after the contract is stable
  and at least two consumers or a clear mechanism owner justify sharing.

## Ownership

Allowed dependency edges:

```text
app -> editor-primitive, engine, lib, ui
editor-primitive -> lib
engine -> lib
ui -> lib (generic helpers only)
```

No reverse dependencies, app-to-app imports, cross-package private imports, or
product policy inside engine/shared foundations.

| Owner | Responsibility |
| --- | --- |
| `apps/*` | Deployable product UX, workflows, commands, persistence policy |
| `packages/lib` | Domain-neutral primitives and algorithms |
| `packages/engine` | Graphics, geometry, rendering, spatial and hit mechanisms |
| `packages/editor-primitive` | Reusable editor interaction semantics |
| `packages/ui` | Reusable presentation primitives and themes |
| `contracts/*` | Language-neutral schemas and protocols |
| `services/*` | Independently deployable backend implementations |

## Code and contracts

- TypeScript stays strict; do not add `any`.
- Let layout explain content; do not add labels that merely repeat structure.
  Keep labels only for control names, accessibility, or disambiguation.
- Define domain/public contracts before behavior.
- Exported APIs use explicit parameter and return types.
- New/changed exported types and non-obvious behavior need semantic comments.
- Prefer pure, deterministic functions; do not mutate inputs or hide global
  state.
- Use semantic names. Avoid `utils`, `helpers`, `common`, `temp`, `new`, and
  `v2` as dumping grounds.
- One file owns one responsibility. Split mixed files near 400 lines; files over
  500 lines must be split unless generated or explicitly deferred.
- Same-stem source/type/test families belong in a same-stem directory when a
  safe refactor already touches that family.

Temporary compatibility must include:

```text
AI-TEMP: <reason>; remove when <condition>; ref <task/doc>
```

## Completion

- Remove replaced logic in the same change; no long-lived parallel paths.
- Run relevant typecheck, lint, and tests.
- Output/snapshot changes require an explicit diff check.
- Record exact blockers and residual risk for any gate that cannot run.
