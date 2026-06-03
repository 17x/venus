# Engine Open-World Capability Backlog (2026-06-01)

## Why

`game` 已升级为城市开放世界 MVP（地图生成、动态 NPC、路灯光源、碰撞阻挡、真实贴图采样）。  
为保持 “一切为 engine 而生”，以下能力应沉淀到 engine，而不是长期停留在 playground 侧脚本。

## Current Playground-side Implementations

- 城市地图生成：`cityWorldGenerator.ts`
- 动态实体（车辆/行人）路径运动：`drivingGamePage.ts`
- 灯光注入（太阳+路灯 point lights）：`engine.runtime.lighting.setCollection(...)`
- 贴图采样：`webTextureSampler.ts` + 场景 tile 采样着色
- 碰撞：`engine.runtime.collision` 已承接通用阻挡体同步、circle-vs-AABB penetration resolution、collider registry、broadphase query 与 trigger events；playground S10 玩家车辆消费该 API，NPC/行人当前采用 path-authored avoidance policy。

## Engine Gaps To Productize

1. World Graph API

- 需要标准化 `world` schema（roads/buildings/props/agents/paths）作为 engine 输入层，而不是仅 `nodes[]`。

2. Navigation/Movement Runtime

- 需要 `engine.runtime.navigation`：
  - path follow
  - waypoint steering
  - crowd/agent update
  - traffic rules
  - pedestrian avoidance
  - spawn/despawn lifecycle

3. Collision Runtime

- 已落地 `engine.runtime.collision` 基线，继续产品化：
  - collider registration
  - broadphase query
  - resolve penetration
  - trigger events
  - collision-aware navigation / crowd avoidance
  - swept collision / continuous collision for high-speed movement 基线已落地，后续可继续扩展 shape coverage

4. Lighting System

- point light 位置/衰减需要进入真正着色计算（当前仍是近似颜色调制）。
- 需要多光源累加模型与性能分级策略（cluster/tile light culling backlog）。

5. Texture/Material Pipeline

- 需要原生 UV + material texture sampler 管线（而非场景端采样后分块着色）。

6. Model/Asset Runtime

- 需要 `engine.runtime.assets`：
  - glTF/model load hooks
  - LOD
  - instancing policy

## Suggested Next Steps

1. 定义 `EngineWorldMapEntity` / `EngineAgentEntity` / `EngineColliderEntity` API contracts.
2. 在 `createEngine.ts` 中增加 `runtime.navigation` 与 `runtime.collision` namespace.
3. WebGL/WebGPU 后端增加 UV/material/light true shading path.
4. 给 playground city demo 改为消费新 API（去除脚本侧自管逻辑）。

## Progress Update (2026-06-01)

- 已落地 `engine.runtime.world` 扩展能力（experimental）：
  - `setOpenWorldMap/getOpenWorldMap`
  - `setAgents/getAgents`
  - `stepAgents`
  - `resolveCollision`
- 已同步 capability map / foundation contract / runtime facade / index types 导出。
- playground `driving-game` 已改为使用 engine API 执行：
  - NPC 车辆与行人路径步进
  - 玩家车辆碰撞求解
  - 城市阻挡体同步到 engine open-world map
- 已补充中英双语文档：
  - `packages/engine/docs/en/api/runtime-world.md`
  - `packages/engine/docs/cn/api/runtime-world.md`
- 已新增环境光照求解 API（通用参数，不含产品语义）：
  - `engine.runtime.lighting.resolveEnvironment`
  - `engine.runtime.lighting.applyEnvironment`
  - `driving-game` 已切换为通过 engine 环境光照输出驱动灯光与 haze。

## Progress Update (2026-06-03)

- `engine.runtime.collision` 已具备并由 contract tests 覆盖：
  - `setObstacles/getObstacles`
  - `registerCollider/unregisterCollider`
  - `queryAabb` broadphase query
  - `resolve` penetration resolution
  - `evaluateTriggers` deterministic enter/stay/exit trigger events
- S10 `driving-game` 玩家车辆通过 substepped adapter 调用 `engine.runtime.collision.resolve`，避免高 delta movement 穿过 blockers。
- S10 NPC cars / pedestrians 当前策略为 path-authored avoidance：fixture 与 fallback generator paths 必须保持在 blockers 外，并由 playground contract tests 覆盖。
- 后续 engine backlog 保留 collision-aware navigation / crowd avoidance，避免在 playground 中沉淀 S10-specific collision APIs。
- 已新增 `engine.runtime.collision.sweepCircle`，提供通用 swept circle continuous collision：返回最早 collider contact、time-of-impact、impact point、normal 与 safe terminal point。
- `sweepCircle` 已加入 stable runtime capability map、public type export、中英文 runtime navigation/collision docs 与 `openWorldRuntime.contract.test.ts` 覆盖。
- 后续 engine backlog 保留 collision-aware navigation / crowd avoidance，并将 swept collision 的后续范围限定为更多 shape coverage / navigation integration，避免在 playground 中沉淀 S10-specific collision APIs。
- 后续 NPC movement depth backlog 保留 traffic rules、pedestrian avoidance、spawn/despawn lifecycle，当前 playground 仅验证 deterministic path stepping 与 minimap projection updates。
