# Repository Ownership

## Top-level names

The current directory names fit this project:

| Name | Meaning |
| --- | --- |
| `apps` | Runnable/deployable products only |
| `packages` | Reusable implementation packages |
| `contracts` | Language-neutral schemas and protocols |
| `services` | Independently deployable backend processes |
| `docs` | Human-facing architecture and decisions |
| `AI` | Short AI execution rules and active briefs |

Do not place runtime code in `contracts`, or backend deployments in `packages`.
An app/package must have `package.json`; an empty idea folder does not count.

## Change scope

Change one app or one package per task by default. A multi-app/package migration
requires an explicit repository-wide/global request. Directly related root
configuration, contracts, tests, and documentation may accompany the approved
scope.

## Dependency graph

Allowed edges:

```text
app -> editor-primitive, engine, lib, ui
editor-primitive -> lib
engine -> lib
ui -> lib (generic helpers only)
```

Forbidden: reverse dependencies, app-to-app imports, private deep imports across
packages, and product policy in shared mechanism packages.

## Placement guide

| Capability | Owner |
| --- | --- |
| Product workflow, permissions, commands, page state | app |
| Rendering, geometry, spatial query, hit-test | engine |
| Reusable selection/transform/command semantics | editor-primitive |
| Generic collections, math, scheduling, serialization | lib |
| Reusable visual components and themes | ui |
| Persisted/cross-language wire shape | contracts |
| Network API, workers, scheduled jobs | services |

Start uncertain behavior in its app. Extract only when the behavior is stable
and either has two consumers, removes material duplication, or clearly belongs
to a mechanism owner. Migration must replace the old path in the same change.

## Naming

- Prefer domain names over vague suffixes such as `common`, `shared`, or `core`.
- Keep an established package name unless a rename materially improves its
  contract; package renames are repository-wide migrations.
- Use platform suffixes only when meaningful (`-web`, `-node`, `-java`).
- Service implementations should describe deployment responsibility, for
  example `sync-api-node` or `render-worker-native`.
