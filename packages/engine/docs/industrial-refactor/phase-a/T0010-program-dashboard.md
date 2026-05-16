# T0010 Program Dashboard

Status: In Progress

## Scope

Track task status, metric trends, and blockers for industrial refactor.

## Task State Machine

- `not-started`
- `in-progress`
- `blocked`
- `done`

## Dashboard Inputs

- task ledger (`dashboard/program-dashboard.json`)
- baseline metrics snapshots
- gate and regression outputs

## Alerts

- blocked task without owner
- redline regression detected
- critical-layer integrity failures

## Implementation Evidence (Kickoff)

- Baseline artifact generation:
  - `pnpm --filter @venus/engine bench:baseline -- --out=/tmp/engine-baseline-report.json`
- Dashboard ingestion:
  - `pnpm --filter @venus/engine dashboard:update --report=/tmp/engine-baseline-report.json`
