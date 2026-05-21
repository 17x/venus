# Replay and Trace

Replay and trace are required for deterministic debugging and backend parity validation.

## Core APIs

- `engine.captureDebugFrame(options)`
- `engine.createReplayToken(scope)`
- `engine.replay(token)`
- `engine.runtime.captureCommandTrace(options)`
- `engine.runtime.getTrace(traceId)`

## Replay Token Contract

A replay token should include:

- engine version
- capability profile
- checksum
- deterministic seed
- optional scene snapshot reference

## Trace Contract

A trace should include:

- frame id and timestamp
- compile/plan/encode/submit stage timings
- backend metadata
- fallback decisions

## Failure Analysis Workflow

1. Capture frame and command trace.
2. Generate replay token from the same scope.
3. Re-run replay in target backend profile.
4. Compare event order and stage timing deltas.
5. Isolate divergence source (compile, planning, command, backend).

## Event Correlation

Use event timeline alongside traces:

- `engine.render.frameStarted`
- `engine.render.frameCompleted`
- `engine.replay.started`
- `engine.replay.completed`
- `engine.replay.failed`
