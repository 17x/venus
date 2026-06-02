# Engine Open-World Capability Backlog (2026-06-01)

## Why
`game` 已升级为城市开放世界 MVP（地图生成、动态 NPC、路灯光源、碰撞阻挡、真实贴图采样）。  
为保持 “一切为 engine 而生”，以下能力应沉淀到 engine，而不是长期停留在 playground 侧脚本。

## Current Playground-side Implementations
- 城市地图生成：`cityWorldGenerator.ts`
- 动态实体（车辆/行人）路径运动：`drivingGamePage.ts`
- 灯光注入（太阳+路灯 point lights）：`engine.runtime.lighting.setCollection(...)`
- 贴图采样：`webTextureSampler.ts` + 场景 tile 采样着色
- 碰撞：2D circle-vs-AABB 阻挡（玩家车辆）

## Engine Gaps To Productize
1. World Graph API
- 需要标准化 `world` schema（roads/buildings/props/agents/paths）作为 engine 输入层，而不是仅 `nodes[]`。

2. Navigation/Movement Runtime
- 需要 `engine.runtime.navigation`：
  - path follow
  - waypoint steering
  - crowd/agent update

3. Collision Runtime
- 需要 `engine.runtime.collision`：
  - collider registration
  - broadphase query
  - resolve penetration
  - trigger events

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
