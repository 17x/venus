# Industrial Refactor Kickoff Workspace

Status: In Progress
Owner: engine/runtime
Last Updated: 2026-05-16

This workspace initializes phase-A execution artifacts for T0001-T0010 from `INDUSTRIAL_ENGINE_REFACTOR_MASTER_PLAN.md`.

## Scope

- Delivery mode: kickoff baseline and governance artifacts.
- Goal: make each task executable, testable, and traceable before deep implementation.
- Non-goal: do not modify core renderer/runtime behavior in this batch.

## Task Coverage (Batch-1)

- T0001: baseline evidence panel template
- T0002: unified terminology dictionary
- T0003: CHANGE REQUEST template and gate script
- T0004: critical-layer contract
- T0005: scene dataset spec and pressure tiers
- T0006: metrics schema and diagnostics snapshot contract
- T0007: device capability profile contract
- T0008: program risk ledger
- T0009: rollout playbook
- T0010: program dashboard and task state board

## Execution Notes

- Every non-trivial implementation must include a `CHANGE REQUEST` file first.
- CI gate for CR is scaffolded in `packages/engine/scripts/check-change-request.mjs`.
- Dashboard source of truth is `dashboard/program-dashboard.json`.
