# 3D-First Runtime And 2D Opt-In

Status: Release contract.
Scope: ENG-003.

`@venus/engine` is 3D-first by default. A consumer can project 2D documents through explicit adapter paths, but default engine creation must not require a Canvas2D product runtime or vector-editor semantics.

## Default Rule

- The default runtime profile is generic and 3D-capable.
- 2D rendering, vector editing, and Canvas2D fallback are explicit opt-in or degraded backend paths.
- Product terms such as vector, SVG, CAD, BIM, medical, and video must stay in app adapters and docs examples outside core engine contracts.

## Allowed 2D Surface

2D payloads may appear only through approved opt-in surfaces, such as explicit Canvas2D draw payload contracts. They must not become required fields in `CreateEngineOptions`.

## Validation

Release validation must keep contract tests proving that default `createEngine` does not expose mandatory Canvas2D hook wiring and that top-level 2D exports remain explicitly approved.
