# Asset Compression Baseline

## Purpose

Define a scenario-neutral, API-first compression baseline for engine runtime evolution.

## Compression Categories

- Geometry compression
- Texture compression
- Animation compression
- Volume compression
- Streaming chunk compression
- Transport-level compression awareness

## Layer Ownership

- kernel: compression-aware asset contracts and decode state model
- orchestration: decode/transcode scheduling and lifecycle coordination
- optimization: precision, latency, and pressure policy arbitration
- platform: codec/transcoder adapters per host runtime
- backend: GPU compressed-format capability negotiation and upload fallback

## API-First Guard

- Compression capabilities must be exposed via governed runtime APIs.
- No product/industry semantics in compression identifiers.
- No direct deep-module integration path for compression flows.

## 3D-First Guard

- Compression baseline serves 3D runtime first.
- 2D-specific compression flows remain explicit opt-in and isolated.

## Initial Capability Targets

- compressed asset registration and descriptor contracts
- async decode status and diagnostics visibility
- backend format probe and fallback trace
- frame-budget aware decode scheduling
- node/headless deterministic decode checkpoints

## Current Contract Alignment (DEX-034/035/036)

- Resource descriptor contracts expose compression policy payloads for geometry/animation quantization, delta mode, chunk sizing, and checkpoint strategy.
- Runtime residency outputs expose deterministic decode precision and checkpoint mode fields.
- Backend diagnostics expose compressed-texture support, upload-path decisions (`direct|transcode|uncompressed`), and fallback reasons.
- WebGPU compressed-format negotiation is supported through adapter-provided probe payloads, with deterministic uncompressed fallback when probe data is absent.

## Descriptor Governance Checklist

- Every new compression descriptor field must be reflected in both EN/CN docs in the same slice.
- Runtime hard-cut contract tests must cover compressed registration, update transitions, and decompression reset behavior.
- Capability-map and API-governance docs must be updated when descriptor semantics become externally observable.
