# Architecture and Boundaries

## Goal

Build a state-driven, API-first, renderer-decoupled runtime.

## Canonical Data Flow

`document -> compiler -> runtime world -> render plan -> command buffer -> backend submit`

No reverse dependency is allowed from upstream layers to product/domain state.

## Boundary Rules

1. Engine core does not host product command/history/undo/redo/collaboration state stores.
2. Product semantics are transformed in app/domain adapters.
3. Engine consumes normalized graph/change sets and view/interaction requests.

## Backend Model

Backends:

- WebGPU
- WebGL
- Canvas2D
- Headless

Applications must not branch on backend implementation details.
Behavior differences are exposed via capability probes and diagnostics.

## Deterministic Subsystems

Mandatory deterministic behavior domains:

- timeline
- simulation step
- replay
- command ordering for equivalent plans

## Reliability Design

- Dirty propagation and compile scheduling are explicit states.
- Fallback behavior is observable through events and diagnostics.
- Frame capture and replay are first-class operations.
