# Venus services

No backend service is shipped with the offline edition.

When cloud synchronization is complete, add exactly one primary API
implementation here (initially `api-node` is recommended). Alternative Java or
native computation services must implement the contracts under `contracts/` and
pass the same conformance fixtures before they can be enabled by the frontend
capability handshake.
