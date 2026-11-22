# Venus contracts

This directory owns language-neutral document and synchronization contracts.
TypeScript packages, future Node/Java services, and native tools must validate
against these files instead of importing another runtime's private types.

- `document/`: persisted, portable document schemas.
- `sync/`: remote synchronization invariants; currently disabled in production.
