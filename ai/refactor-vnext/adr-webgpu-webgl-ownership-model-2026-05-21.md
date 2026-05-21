# ADR: WebGPU/WebGL Ownership Model

Status: Accepted
Date: 2026-05-21
Owner: Engine architecture migration
Scope: Ownership boundary for GPU backend responsibilities across runtime modules and backend adapters.
Related:

- `ai/refactor-vnext/engine-headless-modular-runtime-management.md`
- `ai/refactor-vnext/repo-refactor-management.md`
- `ai/operations/engine-headless-modular-runtime-open-decisions-2026-05-21.md`

## Context

GPU backend extraction is planned for renderer packages. The unresolved decision is whether WebGPU/WebGL should use dual ownership (module + adapter) or adapter-only backend implementation ownership.

Dual ownership risks policy duplication between runtime modules and backend adapters, which can reintroduce hidden coupling during package extraction.

## Decision

Use adapter-only ownership for WebGPU/WebGL backend implementations.

Ownership rule:

- WebGPU/WebGL execution, resource binding, and backend capability probes stay in backend adapters.
- Engine runtime/core modules keep policy and orchestration only (selection policy, frame planning contracts, diagnostics routing).
- Do not add backend-specific execution branches into core/runtime modules.

## Rationale

1. Keeps runtime modules backend-agnostic.
2. Minimizes policy duplication during renderer extraction.
3. Aligns with existing adapter-separation route already validated in H4.
4. Simplifies package split boundaries for `renderer-webgpu` and `renderer-webgl`.

## Consequences

Positive:

- Clear extraction contract for renderer packages.
- Reduced regression surface in engine policy modules.
- Cleaner adapter conformance testing responsibilities.

Trade-offs:

- Adapter contracts must remain precise to avoid leaking policy decisions.
- Diagnostics normalization layer remains required in engine runtime.

## Implementation Constraints

1. Keep backend selector policy in engine/protocol contracts.
2. Keep execution internals in adapter ownership only.
3. Any temporary compatibility branch must include `AI-TEMP` markers and removal criteria.

## Validation Gates

- `pnpm --filter @venus/engine test`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm --filter @venus/engine cr:check`

## Follow-up Actions

- Mark open decision #3 as resolved in the open-decision ledger.
- Keep renderer extraction plan in repo management aligned with adapter-only ownership.
