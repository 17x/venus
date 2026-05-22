# Engine Structure Baseline (Historical Reference)

This file records the historical migration-era tree used before the canonical engine layout was finalized.

Current canonical engine structure is managed by `ai/operations/engine-canonical-governance-readiness-2026-05-20.md`.

Historical status:

- Directory skeleton was created under the historical migration path.
- Canonical alignment moved active engine development back to `packages/engine`.
- Current engine evolution uses single-package internal boundaries: `core`, `protocol`, `adapters`, `profiles`, `runtime`, `api`, and `testing`.

Current rule:

- Do not create new historical migration structures for active engine work.
- Do not split engine into multiple packages until internal protocol/profile boundaries are stable and tested.
- Keep current source folders until their target contracts and tests exist.
