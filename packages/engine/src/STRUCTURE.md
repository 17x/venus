# Engine Staging Structure Baseline (Historical)

This file records the historical staging tree that was used before canonical engine cutover.

Current post-cutover engine structure is managed by `ai/refactor-vnext/engine-headless-modular-runtime-management.md`.

Historical status:

- Directory skeleton was created under the historical staging path.
- Canonical cutover moved active engine development back to `packages/engine`.
- Post-cutover migration now uses single-package internal boundaries: `core`, `protocol`, `adapters`, `profiles`, `runtime`, `api`, and `testing`.

Post-cutover rule:

- Do not create new historical staging structure for the active post-cutover work.
- Do not split engine into multiple packages until internal protocol/profile boundaries are stable and tested.
- Keep current source folders until their target contracts and tests exist.
