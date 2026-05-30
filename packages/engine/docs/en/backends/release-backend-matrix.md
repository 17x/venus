# Release Backend Matrix

Status: Release contract draft.
Scope: ENG-007.

Engine backend docs must describe capability and fallback behavior without forcing a browser-only runtime.

## Backend Levels

- WebGL: primary browser rendering backend for the first commercial release.
- WebGPU: experimental backend where available.
- Canvas2D: explicit fallback or 2D opt-in path, not default product semantics.
- Headless: deterministic validation and capture path for CI and server-like workflows.

## Required Diagnostics

Backends must expose selected backend, fallback reason, unsupported features, capture/readback availability, resource pressure, and frame failure details.

## Headless Rule

Headless examples must not depend on DOM-only assumptions. Any browser-only feature must have a diagnostic downgrade path.
