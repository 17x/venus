# Venus sync protocol v1

Status: reserved; not enabled in the offline edition.

The local editor is the only shipped persistence path. A future remote provider
must preserve these rules:

- Every mutation has a stable `operationId`, `documentId`, `clientId`, and
  `baseRevision`.
- Local persistence completes before remote synchronization is requested.
- Replaying an accepted `operationId` is idempotent.
- The server is authoritative for authorization and shared-document revisions.
- A protocol and schema capability handshake must succeed before cloud UI is
  enabled.
- Existing local documents are never uploaded without an explicit user action.

The first online implementation should use optimistic revision checks. Realtime
multi-user editing is a separate protocol and is not implied by this contract.
