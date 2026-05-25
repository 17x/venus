# API Overview

This page defines the canonical API layering and what each layer is responsible for.

## Layers

1. Developer API (`engine.*`)

- Intended for app teams and adapter integration.
- Must remain concise and stable.

2. Runtime API (`engine.runtime.*`)

- Intended for advanced control, diagnostics, backend parity, and execution-level tooling.
- Exposed but not the default integration surface.

3. Capability API (`engine.capability.*`)

- Scene-agnostic capability packs used to compose product behaviors.
- Must stay free of product and industry semantics.

4. Event API (`engine.events.*` and domain events)

- Subscription and typed event payload contracts.

## Runtime Document Contract Baseline

- Adapter pre-validation entrypoint:
  - `engine.runtime.document.preflightApplyChangeSet(input)`
- Mutable apply entrypoint:
  - `engine.runtime.document.applyChangeSet(input)`
- Warning-code baseline catalog:
  - `ENGINE_RUNTIME_DOCUMENT_WARNING_CODE_BASELINE_REQUIREMENTS`
- Requirement baseline source:
  - `.ai-tasks/engine/playground-s1-s13-requirements-2026-05-24.md` (Section 14)

## Contract Baseline

Every API endpoint must document:

- `stability`: `experimental` | `beta` | `stable`
- `level`: `developer` | `advanced` | `foundation`
- Parameters and constraints
- Return value
- Error codes
- Determinism guarantees (if applicable)
- Related event emissions

## Error Model

Standard error envelope:

```ts
interface EngineApiError {
  code: string;
  message: string;
  retryable: boolean;
  details?: Record<string, unknown>;
}
```

Common error codes:

- `E_INVALID_ARGUMENT`
- `E_SCHEMA_VALIDATION_FAILED`
- `E_RESOURCE_NOT_FOUND`
- `E_BACKEND_UNAVAILABLE`
- `E_BUDGET_EXCEEDED`
- `E_OPERATION_TIMEOUT`
- `E_UNSUPPORTED_CAPABILITY`
- `E_INTERNAL_INVARIANT_BROKEN`

## Parameter Documentation Rules

Each parameter row must include:

- Name
- Type
- Required
- Default value (if optional)
- Valid range or enum
- Side effects

## API Governance Pointers

See [API Governance](../concepts/api-governance.md) for:

- Namespace restrictions
- Semantic stripping process
- Documentation and test gates
