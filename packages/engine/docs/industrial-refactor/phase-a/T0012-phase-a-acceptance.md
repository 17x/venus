# T0012 Phase-A Acceptance

Status: In Progress

## Scope

Phase-A includes T0001-T0011 governance and baseline setup.

## Gate Checklist

- CHANGE REQUEST template and gate exist
- baseline report contract exists
- metrics snapshot path exists
- risk ledger and rollout playbook exist
- boundary charter exists
- dashboard task state and trend structure exist

## Smoke Flow

1. `pnpm --filter @venus/engine cr:check`
2. `pnpm --filter @venus/engine test`
3. `pnpm --filter @venus/engine bench:baseline -- --out=/tmp/engine-baseline-report.json`
4. `pnpm --filter @venus/engine dashboard:update --report=/tmp/engine-baseline-report.json`

## Exit Criteria

- All smoke commands pass.
- Program dashboard has reproducible trend entry format.
