# Package Public APIs (Human Docs)

This folder tracks public API contracts for repo-level and engine-level refactor work.

Purpose:

- Keep human-readable package facade docs separate from internal implementation notes.
- Support destructive refactor with stable public contracts.
- Make cutover and compatibility review auditable.

Current files:

- `venus-lib-api.md`: current `@venus/lib` public API groups.
- `venus-editor-primitive-api.md`: current `@venus/editor-primitive` public API groups.
- `venus-engine-vnext-api.md`: historical vNext baseline for canonical `@venus/engine` public API.
- `venus-runtime-api.md`: proposed `@venus/runtime` public API contract.
- `venus-renderer-packages-api.md`: proposed backend package API contracts.
- `venus-platform-packages-api.md`: proposed platform package API contracts.

Maintenance rule:

- Update these docs in the same change when package public contracts change.
