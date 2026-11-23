# Repository Layout

Venus is organized by deployment responsibility and reusable ownership, not by
a top-level `frontend` / `backend` split. That distinction becomes ambiguous as
soon as a web app performs server-side rendering.

```text
apps/                       runnable user-facing deployments
  vector-editor-web/        browser app; may add an SSR server entry later
  engine-docs/              engine documentation app
  ui-docs/                  @venus/ui catalog and API reference

packages/                   reusable TypeScript implementation
  ui/                       sole reusable UI implementation owner
  engine/                   graphics and rendering mechanisms
  editor-primitive/         reusable editor interaction semantics
  lib/                      domain-neutral foundations
  document-core/            current document/revision package
  sync-core/                current optional sync boundary

contracts/                  language-neutral wire contracts
  document/
  sync/

services/                   independently deployed backend processes
  sync-api-node/            example Node implementation
  sync-api-java/            example Java alternative
  render-worker-native/     example C/C++/Rust worker
```

The example service folders are naming patterns, not required deployments.
Create one only when its executable exists.

## SSR placement

Keep an SSR renderer inside its owning web app when it is deployed together
with that app. A typical app may use `src/client`, `src/server`, and `src/shared`
internally. Move code to `services` only when it becomes an independently
deployed API, worker, gateway, or scheduled process.

Do not rename `vector-editor-web` merely because it gains SSR. The `-web`
suffix still describes its platform. Use an `-ssr` suffix only when two web
deployments must coexist and the rendering mode is their meaningful
difference.

## Backend naming

Name services by responsibility first and implementation technology second:

- prefer `sync-api-node`, `sync-api-java`, and `render-worker-native`;
- avoid vague names such as `backend`, `server`, `common`, or `service-v2`;
- omit the technology suffix when only one implementation exists and the
  technology is not part of the deployment contract;
- keep Java, Node, and native build files inside their service directories;
- exchange data through versioned schemas in `contracts`, never by importing a
  TypeScript package from another language.

## Package naming

Existing names should remain stable until their public contract is migrated.
`document-core` and `sync-core` are understandable but broad; future renames
should prefer the actual capability (for example `document-model` or
`sync-protocol`) and must be handled as repository-wide migrations. No rename
is justified solely for cosmetic consistency.
