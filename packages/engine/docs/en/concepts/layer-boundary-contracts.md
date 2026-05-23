# Layer Boundary Contracts

## Purpose

This document freezes dependency and responsibility boundaries for the five-layer engine architecture:

- backend
- kernel
- optimization
- orchestration
- platform

These contracts are mandatory for all new changes.

## Core Rules

- Keep engine runtime 3D-first by default.
- 2D capabilities must be explicit opt-in modules and cannot become mandatory core dependencies.
- Do not encode domain product semantics or business logic in engine layers.
- Expose capabilities through governed API surface only.

## Allowed Layer Dependencies

- backend -> platform
- kernel -> backend
- kernel -> platform
- optimization -> kernel
- optimization -> backend
- optimization -> platform
- orchestration -> kernel
- orchestration -> optimization
- orchestration -> backend
- orchestration -> platform

## Forbidden Layer Dependencies

- platform -> backend
- platform -> kernel
- platform -> optimization
- platform -> orchestration
- backend -> kernel
- backend -> optimization
- backend -> orchestration
- kernel -> optimization
- kernel -> orchestration
- optimization -> orchestration

## API Exposure Contract

- Public capability entry points must be routed through engine API contracts.
- Do not expose deep internal helpers as external top-level API.
- API names must stay concise, stable, and scenario-neutral.

## Scenario Neutrality Contract

- Scenario support is assembled from generic primitives.
- Forbidden naming patterns include product-level labels and business workflow verbs in engine contracts.
- Use capability-oriented and runtime-oriented names.

## 3D and 2D Contract

- 3D path is the default runtime baseline.
- 2D modules are allowed only when all are true:
  - explicit user scenario requires 2D
  - measurable value is documented
  - activation is opt-in through API
  - no mandatory coupling from default runtime path

## Enforcement Checklist

For each implementation slice:

- dependency direction reviewed
- API exposure reviewed
- semantic neutrality reviewed
- 3D-first and 2D opt-in compliance reviewed
- boundary tests updated when imports or exports change
