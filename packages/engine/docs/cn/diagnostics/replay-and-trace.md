# 回放与追踪

回放与追踪是确定性调试和后端一致性验证的必备能力。

## 核心 API

- `engine.captureDebugFrame(options)`
- `engine.createReplayToken(scope)`
- `engine.replay(token)`
- `engine.runtime.captureCommandTrace(options)`
- `engine.runtime.getTrace(traceId)`

## Replay Token 契约

token 应至少包含：

- engine 版本
- capability profile
- checksum
- deterministic seed
- 可选的场景快照引用

## Trace 契约

trace 应至少包含：

- frame id 与时间戳
- compile/plan/encode/submit 分阶段耗时
- 后端元数据
- fallback 决策信息

## 故障分析流程

1. 抓取问题帧与命令追踪。
2. 以同 scope 生成 replay token。
3. 在目标后端 profile 下复跑 replay。
4. 比较事件顺序与阶段耗时差异。
5. 定位分歧来源（compile、planning、command、backend）。

## 事件关联分析

建议结合事件时间线分析：

- `engine.render.frameStarted`
- `engine.render.frameCompleted`
- `engine.replay.started`
- `engine.replay.completed`
- `engine.replay.failed`
