# Runtime Observability API

状态：beta
层级：foundation

## 接口

1. `engine.runtime.observability.startTrace(options)`
2. `engine.runtime.observability.stopTrace(traceId)`
3. `engine.runtime.observability.getTrace(traceId)`
4. `engine.runtime.observability.getMetricsSnapshot()`
5. `engine.runtime.observability.captureFrame(options)`
6. `engine.runtime.observability.createReplayToken(scope)`
7. `engine.runtime.observability.replay(token)`

## 错误码

1. `ENGINE_OBSERVABILITY_TRACE_NOT_FOUND`
2. `ENGINE_OBSERVABILITY_INVALID_INPUT`

## 确定性

在相同输入与相同 observability 状态下，输出保持确定性。
