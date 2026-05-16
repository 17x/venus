# T0006 Metrics SDK and Report Format

Status: In Progress

## Per-Frame Snapshot Contract

- `frame`: frame index and timing metrics
- `latency`: input-to-photon and queue wait
- `quality`: missing ratio and fallback ratio
- `critical`: critical-layer integrity markers
- `cache`: hit/eviction/stale reuse
- `upload`: bytes and critical upload latency
- `stability`: error/drift/leak indicators

## Sampling Rules

- Interactive phase: high-frequency sampling with bounded overhead.
- Static phase: reduced frequency but complete quality coverage.
- Debug mode: extra fields allowed.
- Release mode: strict overhead budget and schema stability.

## Acceptance

- Every frame emits schema-valid diagnostics snapshot.
- Stress input does not introduce significant jitter from instrumentation.

## Implementation Evidence (Kickoff)

- Generate baseline report with per-frame snapshots:
  - `pnpm --filter @venus/engine bench:baseline -- --out=/tmp/engine-baseline-report.json`
- Validate report ingestion into dashboard trend:
  - `pnpm --filter @venus/engine dashboard:update --report=/tmp/engine-baseline-report.json`
