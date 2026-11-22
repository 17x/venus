# Local-first application architecture

Status: Active

## Product rule

Venus is one local-first editor, not separate offline and cloud forks. Every
edition stores the active working copy in IndexedDB. The offline edition composes
a disabled sync provider. A future cloud edition will retain the same local
repository and add a remote provider only after a compatible capability
handshake.

## Write path

1. Runtime commands commit an editor document change.
2. The autosave controller coalesces short bursts and serializes writes.
3. Document JSON and binary assets are written to separate IndexedDB stores.
4. A bounded recovery history keeps the five latest document revisions.
5. The optional sync provider is notified only after local persistence succeeds.

## Ownership

- `@venus/document-core`: platform-neutral stored-document envelopes and
  revision helpers.
- `@venus/sync-core`: platform-neutral sync-provider contract and the production
  disabled provider.
- `apps/vector-editor-web/src/runtime/persistence`: browser repository,
  autosave, asset hydration, and edition composition.
- `contracts`: language-neutral schemas for future non-TypeScript consumers.

## Offline shell

The production service worker caches the built application shell and successful
same-origin GET responses. IndexedDB owns user data; the service-worker cache
must never be treated as document storage.

## Online release gate

Cloud capabilities remain false until authentication, schema negotiation,
idempotent retries, asset synchronization, permission checks, and two-device
conflict behavior all pass product tests. Signing in must not silently upload
local-only documents.
