# T0054 Texture Cache V2

Status: in-progress
Owner: engine/runtime

## Scope

- Add critical/high/normal/background texture tiers.
- Prioritize upload queue by tier and pressure state.
- Apply overload eviction without violating critical visibility.

## Acceptance

- Critical textures remain visible under high pressure.

## Validation

- Upload priority and eviction tests.
