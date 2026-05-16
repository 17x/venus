# T0003 CHANGE REQUEST and CI Gate

Status: In Progress

## Deliverables

- Canonical CR template:
  - `governance/change-request-template.md`
- Kickoff CR:
  - `change-requests/CR-T0001-T0010-kickoff.md`
- CR check script:
  - `packages/engine/scripts/check-change-request.mjs`

## Gate Rule v1

- If change touches `packages/engine/src/**` or `packages/engine/scripts/**`, diff must include at least one file in:
  - `packages/engine/docs/industrial-refactor/change-requests/*.md`

## Acceptance

- Missing CR causes non-zero exit code.
- Trivial docs-only changes can pass without CR.
