# Vector Runtime Presets Integration

Vector app local note for `@venus/runtime/presets` adoption.

## Stable Knowledge

- Logical import path is `@venus/runtime/presets`.
- Presets package owns opinionated default behavior packs.
- Presets should remain reusable and not embed vector-only product semantics.

## Vector Usage Boundary

- Use presets as default policy modules.
- Keep vector-only behavior composition in app layer.
- Keep migration and timeline details in changelog, not in this local note.

## Ownership Summary

- Runtime presets own reusable policy bundles.
- Runtime core owns orchestration and worker bridge behavior.
- Vector app owns product-layer composition and UI behavior.