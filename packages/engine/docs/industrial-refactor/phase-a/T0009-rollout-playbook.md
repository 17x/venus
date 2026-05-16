# T0009 Rollout Playbook

Status: In Progress

## Rollout Stages

- Stage 0: experiment flag, internal only
- Stage 1: profile-scoped canary
- Stage 2: device-tier staggered rollout
- Stage 3: default-on with monitoring

## Guard Conditions

- SLO thresholds must remain inside redline constraints.
- Critical-layer integrity must remain 100% for medical profile.
- Regression gate violations trigger automatic rollback.

## Rollback Conditions

- p99 latency breach over defined window
- critical-layer integrity violation
- backend compatibility gate failure
