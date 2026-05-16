# T0001 Baseline Evidence Panel

Status: In Progress

## Goal

Freeze current engine baseline and provide reproducible evidence across profiles.

## Repro Scenarios (Minimum)

- Editor: dense node interaction and zoom/pan flow
- Game: dynamic objects and effects stress
- Animation: long timeline and seek stability
- Medical: critical-layer visibility and fidelity
- Massive-data: 300k+ mixed geometry roam

## Report Fields (Required)

- Run metadata: git commit, date, device profile, backend
- Frame: fps p50/p95/p99, jank count, missed frames
- Latency: input-to-photon p50/p95/p99
- Quality: missing ratio, fallback ratio
- Cache: hit/evict/stale-reuse
- Upload: bytes/frame, critical upload latency
- Stability: crash/leak/long-run drift

## Repro Command Checklist

- `pnpm --filter @venus/engine bench:scenario`
- `pnpm --filter @venus/engine bench:baseline -- --out=/tmp/engine-baseline-report.json`
- `pnpm --filter @venus/engine test`
- `pnpm typecheck`

## Acceptance

- Any scenario can produce the same report schema.
- 10 repeated runs produce quantified variance.
