# T0004 Critical-Layer Contract

Status: In Progress

## Purpose

Define a hard guard so degradation cannot break critical semantics.

## Critical-Layer Classes

- Editor semantics: selection outline, edit anchors, active manipulation handles
- Medical semantics: key tissue structures, lesion markers, physician annotations
- Diagnostic semantics: QA overlays and must-display labels

## Hard Rules

- Critical layer visibility must be preserved in all phases.
- Critical layer clarity cannot be degraded by fallback passes.
- Policy conflicts resolve in this order:
  - critical-layer integrity
  - medical profile integrity
  - phase budget targets
  - non-critical visual fidelity

## Test Requirements

- Unit: any degradation pass must skip nodes tagged as critical-layer.
- Integration: under pressure, critical layers remain visible and sharp.
