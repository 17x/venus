# API Surface Governance

## Purpose

This governance defines how engine capabilities are exposed to consumers:

- API-first only
- concise naming only
- scenario-neutral semantics only

## Exposure Policy

- Public usage must go through the governed engine API surface.
- Do not expose deep internal modules as public integration entry points.
- Do not add ad hoc helper exports to top-level barrel files.
- Runtime capabilities must be exposed as stable callable APIs.

## Naming Policy

- Names must be short and intent-clear.
- Prefer one verb plus one domain noun.
- Avoid product-specific, industry-specific, or business workflow naming.
- Avoid redundant prefixes and overloaded abbreviations.

Examples:

- prefer: planFrame, pick, raycast, getStats, startTrace
- avoid: runMedicalWorkflowPlanner, executeBusinessReviewFlow

## API Shape Policy

- Prefer small cohesive API groups.
- Keep method names stable across scenarios.
- Use the same primitive contracts across different scenario compositions.
- New APIs require contract docs and capability-map alignment.

## Export Policy

- Top-level barrel exports must stay within canonical layer roots.
- Testing or diagnostics helper exports require explicit exception records.
- Legacy and transitional path exports are forbidden.

Current explicit export exceptions:

- ./testing/createTestSurface

2D opt-in export guard:

- 2D-related exports are allowed only for explicit opt-in integration surfaces.
- Default runtime path must not require 2D integration hooks.

## Review Checklist

- Is this API on the governed surface?
- Is the name concise and neutral?
- Does it avoid product/business semantics?
- Is there an existing API that should be reused instead?
- Is capability-map and docs coverage updated?
