# Engine API 需求清单（基于 2.3 Capability Mapping）

状态：Draft
日期：2026-05-21
来源：`ai/operations/engine-modern-realtime-3d-platform-agnostic-plan-2026-05-21.md` 第 2.3 节
目标：把 30 个产品场景映射收敛为可执行的抽象 API 需求列表，供 engine API 设计与实现排期。

## 0. 约束与边界

1. engine 只提供抽象能力 API，不提供行业语义 API。
2. 禁止新增行业前缀命名（medical/bim/gis/cad/finance/video/game 等）。
3. 产品语义只允许出现在 demo、文档 use-case、adapter 层映射，不进入 engine public surface。
4. API 先定义 contract 与 docs，再进入实现（API-first）。

## 1. 能力包优先级（由场景覆盖度推导）

说明：覆盖度 = 在 30 场景中被引用次数。

- P0（核心能力，M0-M2 必须完成）
- P1（高价值能力，M2-M4 完成）
- P2（扩展能力，M4-M6 完成）

| 能力包                          | 覆盖度 | 优先级 |
| ------------------------------- | -----: | ------ |
| Render And Composition          |     20 | P0     |
| Spatial Query And Picking       |     16 | P0     |
| Overlay And Annotation          |     13 | P0     |
| Geometry And Topology           |     12 | P0     |
| Temporal Timeline               |     11 | P1     |
| Diagnostics And Replay          |     10 | P1     |
| Data Field And Analysis         |      8 | P1     |
| Viewport And Camera             |      8 | P1     |
| Simulation And State Transition |      7 | P1     |
| Collaboration Boundary          |      4 | P2     |
| Resource And Streaming          |      4 | P2     |
| Media And Multi-source          |      4 | P2     |
| GPU Explicit                    |      4 | P2     |
| Backend And Session             |      3 | P2     |
| Geospatial                      |      2 | P2     |

## 2. API 需求列表（按能力包）

### 2.1 P0：Render And Composition

- 必需 API
- `engine.capability.render.renderFrame(request)`
- `engine.capability.render.invalidate(reason)`
- `engine.capability.render.setQuality(profile)`
- `engine.capability.composition.setGraph(graph)`
- `engine.capability.composition.compose(request)`
- 合同要求
- 输入必须显式声明 view、resource budget、output target。
- 输出必须包含 frameId、renderCostSummary、fallbackInfo。

### 2.2 P0：Spatial Query And Picking

- 必需 API
- `engine.capability.spatial.query(query)`
- `engine.capability.spatial.queryViewportCandidates(query)`
- `engine.capability.spatial.queryFrustumVisibleSet(query)`
- `engine.capability.picking.pick(point, options)`
- `engine.capability.picking.raycast(ray, options)`
- 合同要求
- 查询结果必须稳定排序（deterministic ordering）。
- 命中结果必须包含 id、score、space、metadataRef。

### 2.3 P0：Overlay And Annotation

- 必需 API
- `engine.capability.overlay.setOverlays(overlays)`
- `engine.capability.overlay.clear(scope)`
- `engine.capability.overlay.setTransformPreview(preview)`
- `engine.capability.annotation.setAnnotations(annotations)`
- 合同要求
- overlay 必须与产品状态解耦，只接收归一化 overlay payload。
- 每个 overlay item 必须可追踪 sourceId 与 revision。

### 2.4 P0：Geometry And Topology

- 必需 API
- `engine.capability.geometry.setModel(model)`
- `engine.capability.geometry.updateModel(patch)`
- `engine.capability.geometry.queryTopology(query)`
- `engine.capability.geometry.computeBounds(input)`
- 合同要求
- `setModel` 与 `updateModel` 必须共享同一 schema 语义。
- patch 应支持增删改与版本冲突检测。

### 2.5 P1：Temporal Timeline

- 必需 API
- `engine.capability.timeline.setRange(range)`
- `engine.capability.timeline.setCursor(cursor)`
- `engine.capability.timeline.play(options)`
- `engine.capability.timeline.pause()`
- `engine.capability.timeline.seek(time)`
- 合同要求
- timeline 逻辑必须 deterministic（相同输入得到相同帧序列）。

### 2.6 P1：Diagnostics And Replay

- 必需 API
- `engine.capability.diagnostics.getSummary()`
- `engine.capability.diagnostics.captureFrame(options)`
- `engine.capability.diagnostics.getMetrics()`
- `engine.capability.replay.createToken(scope)`
- `engine.capability.replay.run(token)`
- 合同要求
- replay token 必须可校验（checksum + version + capability profile）。

### 2.7 P1：Data Field And Analysis

- 必需 API
- `engine.capability.field.setScalarField(field)`
- `engine.capability.field.setVectorField(field)`
- `engine.capability.field.setTransferFunction(tf)`
- `engine.capability.field.setIsoValue(value)`
- `engine.capability.field.probe(position)`
- 合同要求
- 采样结果必须包含单位、坐标系和插值策略标识。

### 2.8 P1：Viewport And Camera

- 必需 API
- `engine.capability.view.setViewport(viewport)`
- `engine.capability.view.setCamera(camera)`
- `engine.capability.view.fit(bounds, options)`
- `engine.capability.view.project(input)`
- `engine.capability.view.unproject(input)`
- 合同要求
- project/unproject 必须满足可逆性容差规范。

### 2.9 P1：Simulation And State Transition

- 必需 API
- `engine.capability.simulation.initialize(state)`
- `engine.capability.simulation.step(deltaTime)`
- `engine.capability.simulation.setStatePatch(patch)`
- `engine.capability.simulation.queryState(query)`
- 合同要求
- `step` 必须支持 fixed-step 与 deterministic seed。

### 2.10 P2：Resource And Streaming

- 必需 API
- `engine.capability.resource.load(assets)`
- `engine.capability.resource.unload(assetIds)`
- `engine.capability.resource.preload(request)`
- `engine.capability.streaming.connect(endpoint)`
- `engine.capability.streaming.setBudget(budget)`
- `engine.capability.streaming.pushChunk(chunk)`

### 2.11 P2：Media And Multi-source

- 必需 API
- `engine.capability.media.setSources(sources)`
- `engine.capability.media.setTimeline(timeline)`
- `engine.capability.media.renderAt(time)`
- `engine.capability.media.capture(options)`

### 2.12 P2：GPU Explicit

- 必需 API
- `engine.capability.gpu.createResource(descriptor)`
- `engine.capability.gpu.updateResource(resourceId, update)`
- `engine.capability.gpu.createUploadBatch(request)`
- `engine.capability.gpu.createBarrierPlan(request)`
- `engine.capability.gpu.submit(commandBuffer)`
- `engine.capability.gpu.readback(request)`

### 2.13 P2：Backend And Session

- 必需 API
- `engine.capability.session.mount(target)`
- `engine.capability.session.unmount()`
- `engine.capability.session.createHeadless(options)`
- `engine.capability.backend.setPreference(preference)`
- `engine.capability.backend.getInfo()`

### 2.14 P2：Collaboration Boundary

- 必需 API
- `engine.capability.collaboration.setRemotePointers(pointers)`
- `engine.capability.collaboration.setPresence(presence)`
- `engine.capability.collaboration.setSharedViewport(state)`
- `engine.capability.collaboration.setIssueMarkers(markers)`

### 2.15 P2：Geospatial

- 必需 API
- `engine.capability.geo.setReference(reference)`
- `engine.capability.geo.addTileset(tileset)`
- `engine.capability.geo.worldToGeo(point)`
- `engine.capability.geo.geoToWorld(position)`
- `engine.capability.geo.setCullingPolicy(policy)`

## 3. 文档与契约产物要求

- 每个能力包必须产出三类内容
- `*.contract.ts`：输入/输出/错误/稳定性级别
- `docs/en/api/*.md` 与 `docs/cn/api/*.md`：开发者文档（同构）
- `testing/contract/*.test.ts`：契约一致性测试

- 每个 API 文档必须包含
- 使用级别：`developer` 或 `advanced`
- 输入 schema 与最小示例
- 输出 schema 与错误语义
- 性能预算字段（若适用）
- 兼容策略与禁用场景语义说明

## 4. 交付节奏（建议）

1. M0：冻结 P0 能力包 API contract + docs 索引。
2. M1：完成 P0 API 首版实现与契约测试。
3. M2：完成 P1 API 首版实现，补齐 replay/diagnostics 基线。
4. M3-M4：完成 P2 API，收敛后端与 GPU 显式链路。
5. M5-M6：清理临时适配，移除语义泄漏与重复入口。

## 5. 阻断规则

1. 新增任何行业前缀 API：阻断。
2. 新增 API 无 contract 或 docs：阻断。
3. docs en/cn 不同构：阻断。
4. public API 与 capability pack 不一致：阻断。
