# T0008 Program Risk Ledger

Status: In Progress

## Risk Levels

- `R1`: low risk, local mitigation available
- `R2`: medium risk, cross-module validation needed
- `R3`: high risk, rollout guard and rollback path required
- `R4`: critical risk, release-blocking until mitigated

## Initial Risk Register

- Policy divergence risk: strategy complexity causes inconsistent outcomes
- Performance regression risk: frame pacing destabilized under pressure
- Medical integrity risk: critical-layer visibility degradation
- Backend inconsistency risk: WebGL/WebGPU behavior mismatch

## Rollback Policy

- Every R3/R4 change must include a rollback switch.
- Rollback owner and trigger thresholds are mandatory.
- Incident timeline must be auditable.
