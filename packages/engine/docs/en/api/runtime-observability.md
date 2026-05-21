# Runtime Observability API

Status: beta
Level: foundation

## Endpoints

1. `engine.runtime.observability.startTrace(options)`
2. `engine.runtime.observability.stopTrace(traceId)`
3. `engine.runtime.observability.getTrace(traceId)`
4. `engine.runtime.observability.getMetricsSnapshot()`
5. `engine.runtime.observability.captureFrame(options)`
6. `engine.runtime.observability.createReplayToken(scope)`
7. `engine.runtime.observability.replay(token)`

## Error Codes

1. `ENGINE_OBSERVABILITY_TRACE_NOT_FOUND`
2. `ENGINE_OBSERVABILITY_INVALID_INPUT`

## Determinism

For identical inputs and observability state, outputs are deterministic.
