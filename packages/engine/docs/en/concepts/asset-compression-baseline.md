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
