# Breaking Changes Policy and Ledger

This document defines what counts as a breaking change and how it must be documented.

## Breaking Change Categories

1. Signature changes

- Function names changed
- Parameter names or requiredness changed

2. Contract changes

- Return schema changed
- Error code semantics changed
- Determinism guarantees changed

3. Event changes

- Event name changes
- Payload field removal/rename
- Event ordering contract changes

4. Behavior changes

- Backend fallback policy changes
- Default quality policy changes

## Required Artifacts for Breaking Changes

Every breaking change must include:

- Migration note in this document
- Adapter migration guidance update
- EN/CN API reference updates
- Contract and regression test updates
- Changelog entry with explicit impact scope

## Release Discipline

- Breaking changes are only allowed in major versions.
- Minor releases may add new optional fields or new APIs with backward compatibility.
- Patch releases must not change public semantics.

## Current Ledger Template

Use this table for each approved breaking change:

| Version | Area          | Change                    | Impact                 | Migration Action             | Status  |
| ------- | ------------- | ------------------------- | ---------------------- | ---------------------------- | ------- |
| `canonical` | API namespace | Removed compat-only alias | Adapter compile errors | Update imports and callsites | Planned |

## Validation Checklist

1. EN/CN docs updated in same PR.
2. Runtime/capability tests updated.
3. Event payload parity verified.
4. Adapter migration example added.
