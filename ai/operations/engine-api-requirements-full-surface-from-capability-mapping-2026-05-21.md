# Engine API 需求清单（Full Surface，基于 2.3 能力映射）

状态：DONE
日期：2026-05-21
来源：`ai/operations/engine-modern-realtime-3d-platform-agnostic-plan-2026-05-21.md` 第 2.2/2.3/2.4 节
目标：给出“可直接落地 contract”的全量 API 需求列表，覆盖能力抽象 + engine 基础能力定义。

## 0. 强约束（必须遵守）

1. engine 仅暴露抽象能力，不暴露行业语义 API。
2. public API 命名仅允许 `engine.*`、`engine.runtime.*`、`engine.capability.*`。
3. 所有 API 先定义 contract（输入/输出/错误/稳定性）再实现。
4. 所有 public API 必须有 `docs/en` 与 `docs/cn` 同构文档。
5. 任何行业前缀 API（medical/bim/gis/cad/finance/video/game 等）直接阻断。

## 1. API 分层（完整定义）

- L1 Developer API：业务 app/adapter 默认入口。
- L2 Runtime API：高级执行与调试入口（不作为普通 app 首选）。
- L3 Capability API：场景无关能力包入口（2.3 场景映射的唯一 API 基底）。
- L0 Engine Foundation Contracts：基础契约层（document/world/dirty/command/backend）。

## 2. Engine 基础能力定义（L0，新增完整项）

### 2.1 Document Foundation

- `engine.runtime.document.createSnapshot(input)`
- `engine.runtime.document.validateSnapshot(snapshot)`
- `engine.runtime.document.applyChangeSet(changeSet)`
- `engine.runtime.document.diffSnapshots(base, target)`
- `engine.runtime.document.rebaseChangeSet(baseRevision, changeSet)`
- `engine.runtime.document.serializeSnapshot(snapshot, options)`
- `engine.runtime.document.deserializeSnapshot(payload, options)`
- `engine.runtime.document.getRevision()`
- `engine.runtime.document.getSchemaVersion()`

### 2.2 Runtime World Foundation

- `engine.runtime.world.compileFromDocument(options)`
- `engine.runtime.world.getWorldSnapshot()`
- `engine.runtime.world.queryEntity(entityId)`
- `engine.runtime.world.queryComponent(query)`
- `engine.runtime.world.getGraphStats()`
- `engine.runtime.world.clear()`

### 2.3 Dirty System Foundation

- `engine.runtime.dirty.mark(domain, token)`
- `engine.runtime.dirty.markBatch(domains)`
- `engine.runtime.dirty.getState()`
- `engine.runtime.dirty.getPendingDomains()`
- `engine.runtime.dirty.flush(domains)`
- `engine.runtime.dirty.reset()`

### 2.4 Command Buffer Foundation

- `engine.runtime.command.createEncoder(options)`
- `engine.runtime.command.encode(plan)`
- `engine.runtime.command.validate(buffer)`
- `engine.runtime.command.optimize(buffer, profile)`
- `engine.runtime.command.inspect(buffer)`
- `engine.runtime.command.replay(buffer, context)`

### 2.5 Render Planning Foundation

- `engine.runtime.plan.createFramePlan(request)`
- `engine.runtime.plan.createVisibilityPlan(request)`
- `engine.runtime.plan.createLodPlan(request)`
- `engine.runtime.plan.createRoiPlan(request)`
- `engine.runtime.plan.createBudgetPlan(request)`
- `engine.runtime.plan.inspect(plan)`

### 2.6 Backend Foundation

- `engine.runtime.backend.listAvailable()`
- `engine.runtime.backend.select(preference)`
- `engine.runtime.backend.getActive()`
- `engine.runtime.backend.getCapabilities()`
- `engine.runtime.backend.getLimits()`
- `engine.runtime.backend.getFallbackTrace()`
- `engine.runtime.backend.probeHeadless()`

### 2.7 Resource Foundation

- `engine.runtime.resource.register(descriptor)`
- `engine.runtime.resource.update(resourceId, patch)`
- `engine.runtime.resource.release(resourceId)`
- `engine.runtime.resource.pin(resourceId)`
- `engine.runtime.resource.unpin(resourceId)`
- `engine.runtime.resource.getResidency(resourceId)`
- `engine.runtime.resource.collectGarbage(options)`

### 2.8 Observability Foundation

- `engine.runtime.observability.startTrace(options)`
- `engine.runtime.observability.stopTrace(traceId)`
- `engine.runtime.observability.getTrace(traceId)`
- `engine.runtime.observability.getMetricsSnapshot()`
- `engine.runtime.observability.captureFrame(options)`
- `engine.runtime.observability.createReplayToken(scope)`
- `engine.runtime.observability.replay(token)`

## 3. Developer API（L1，完整入口）

### 3.1 生命周期与配置

- `createEngine(options)`
- `engine.ready()`
- `engine.mount(target)`
- `engine.unmount()`
- `engine.dispose()`
- `engine.configure(options)`
- `engine.getConfig()`
- `engine.resetConfig(scope)`

### 3.2 场景输入与校验

- `engine.setGraph(graph)`
- `engine.updateGraph(patch)`
- `engine.batchUpdateGraph(patches)`
- `engine.getGraph()`
- `engine.clearGraph()`
- `engine.validateGraph(graph)`
- `engine.normalizeGraph(input)`
- `engine.importGraph(payload, options)`
- `engine.exportGraph(options)`

### 3.3 视图、相机与多视口

- `engine.resize(size)`
- `engine.setView(view)`
- `engine.getView()`
- `engine.fitToBounds(bounds, options)`
- `engine.resetView(options)`
- `engine.setViewportLayout(layout)`
- `engine.getViewportLayout()`
- `engine.screenToWorld(point, options)`
- `engine.worldToScreen(point, options)`

### 3.4 渲染与调度

- `engine.render()`
- `engine.renderNow(request)`
- `engine.invalidate(reason)`
- `engine.pause()`
- `engine.resume()`
- `engine.setQuality(profile)`
- `engine.getQuality()`
- `engine.setFrameBudget(budget)`
- `engine.getFrameBudget()`

### 3.5 命中、查询与交互表达

- `engine.pick(point, options)`
- `engine.pickRect(rect, options)`
- `engine.pickLasso(path, options)`
- `engine.raycast(ray, options)`
- `engine.query(bounds, options)`
- `engine.queryFrustum(frustum, options)`
- `engine.setInteractionState(state)`
- `engine.clearInteractionState(scope)`

### 3.6 Overlay、注解与预览

- `engine.setOverlays(overlays)`
- `engine.appendOverlays(overlays)`
- `engine.updateOverlay(overlayId, patch)`
- `engine.removeOverlay(overlayId)`
- `engine.clearOverlays(scope)`
- `engine.setTransformPreview(preview)`
- `engine.clearTransformPreview()`
- `engine.setAnnotations(annotations)`
- `engine.clearAnnotations(scope)`

### 3.7 资源与媒体

- `engine.loadAssets(assets)`
- `engine.preloadAssets(request)`
- `engine.unloadAssets(assetIds)`
- `engine.getAssetState(assetId)`
- `engine.getAssetStats()`
- `engine.setMediaSources(sources)`
- `engine.seekMedia(time)`
- `engine.captureImage(options)`
- `engine.captureVideoFrame(options)`

### 3.8 后端、会话与离屏

- `engine.setBackendPreference(preference)`
- `engine.getBackendInfo()`
- `engine.getCapabilities()`
- `engine.createHeadlessSession(options)`
- `engine.destroyHeadlessSession(sessionId)`
- `engine.renderHeadless(request)`

### 3.9 事件与诊断

- `engine.on(event, listener)`
- `engine.off(event, listener)`
- `engine.once(event, listener)`
- `engine.getDiagnostics()`
- `engine.getMetrics()`
- `engine.setDiagnosticsEnabled(enabled)`
- `engine.captureDebugFrame(options)`
- `engine.createReplayToken(scope)`
- `engine.replay(token)`

### 3.10 Adapter Helper（边界转换）

- `createEngineGraphFromDomainModel(input)`
- `createEngineGraphPatchFromDomainDelta(input)`
- `createEngineOverlaysFromDomainState(input)`
- `createEnginePickRequestFromDomainInput(input)`
- `assertEngineSafeInput(input)`

## 4. Runtime API（L2，完整执行面）

### 4.1 Document/World

- `engine.runtime.getDocumentSnapshot()`
- `engine.runtime.getDocumentRevision()`
- `engine.runtime.applyChangeSet(changeSet)`
- `engine.runtime.compileWorld(options)`
- `engine.runtime.getRuntimeWorld()`
- `engine.runtime.getRuntimeWorldStats()`

### 4.2 Dirty 与增量编译

- `engine.runtime.getDirtyState()`
- `engine.runtime.markDirty(domain, token)`
- `engine.runtime.flushDirtyState(domains)`
- `engine.runtime.scheduleIncrementalCompile(options)`
- `engine.runtime.forceFullCompile(reason)`

### 4.3 计划、命令与提交

- `engine.runtime.createRenderPlan(request)`
- `engine.runtime.inspectRenderPlan(plan)`
- `engine.runtime.encodeCommandBuffer(plan)`
- `engine.runtime.validateCommandBuffer(buffer)`
- `engine.runtime.submit(commandBuffer)`
- `engine.runtime.submitBatch(commandBuffers)`

### 4.4 GPU 显式链路

- `engine.runtime.createGpuResource(descriptor)`
- `engine.runtime.updateGpuResource(resourceId, patch)`
- `engine.runtime.destroyGpuResource(resourceId)`
- `engine.runtime.createUploadBatch(request)`
- `engine.runtime.createBarrierPlan(request)`
- `engine.runtime.applyBarrierPlan(plan)`
- `engine.runtime.readbackResource(request)`

### 4.5 空间与命中低层能力

- `engine.runtime.queryViewportCandidates(query)`
- `engine.runtime.queryFrustumVisibleSet(query)`
- `engine.runtime.hitTestPlanar(point, options)`
- `engine.runtime.hitTestRay(ray, options)`
- `engine.runtime.querySpatialIndex(query)`

### 4.6 后端运行态

- `engine.runtime.getBackendState()`
- `engine.runtime.switchBackend(target, options)`
- `engine.runtime.getBackendFallbackHistory()`
- `engine.runtime.setBackendDebugOptions(options)`

### 4.7 观测与回放

- `engine.runtime.captureFrame(options)`
- `engine.runtime.captureCommandTrace(options)`
- `engine.runtime.createReplayToken(scope)`
- `engine.runtime.replay(token)`
- `engine.runtime.getMetrics()`
- `engine.runtime.getTrace(traceId)`

## 5. Capability API（L3，完整能力包）

## 5.1 Geometry And Topology

- `engine.capability.geometry.setModel(model)`
- `engine.capability.geometry.updateModel(patch)`
- `engine.capability.geometry.removeNodes(nodeIds)`
- `engine.capability.geometry.reorderNodes(order)`
- `engine.capability.geometry.queryTopology(query)`
- `engine.capability.geometry.querySubgraph(query)`
- `engine.capability.geometry.computeBounds(input)`
- `engine.capability.geometry.computeNormals(input)`
- `engine.capability.geometry.computeTangents(input)`
- `engine.capability.geometry.validateModel(model)`

## 5.2 Viewport And Camera

- `engine.capability.view.setViewport(viewport)`
- `engine.capability.view.getViewport()`
- `engine.capability.view.setCamera(camera)`
- `engine.capability.view.getCamera()`
- `engine.capability.view.fit(bounds, options)`
- `engine.capability.view.reset(options)`
- `engine.capability.view.project(input)`
- `engine.capability.view.unproject(input)`
- `engine.capability.view.setMultiView(layout)`
- `engine.capability.view.getMultiView()`

## 5.3 Spatial Query And Picking

- `engine.capability.spatial.query(query)`
- `engine.capability.spatial.queryViewportCandidates(query)`
- `engine.capability.spatial.queryFrustumVisibleSet(query)`
- `engine.capability.spatial.queryNearest(query)`
- `engine.capability.spatial.queryKnn(query)`
- `engine.capability.spatial.queryOcclusion(query)`
- `engine.capability.picking.pick(point, options)`
- `engine.capability.picking.pickRect(rect, options)`
- `engine.capability.picking.pickLasso(path, options)`
- `engine.capability.picking.raycast(ray, options)`

## 5.4 Overlay And Annotation

- `engine.capability.overlay.setOverlays(overlays)`
- `engine.capability.overlay.appendOverlays(overlays)`
- `engine.capability.overlay.updateOverlay(overlayId, patch)`
- `engine.capability.overlay.removeOverlay(overlayId)`
- `engine.capability.overlay.clear(scope)`
- `engine.capability.overlay.setTransformPreview(preview)`
- `engine.capability.overlay.clearTransformPreview()`
- `engine.capability.annotation.setAnnotations(annotations)`
- `engine.capability.annotation.updateAnnotation(annotationId, patch)`
- `engine.capability.annotation.clear(scope)`

## 5.5 Temporal Timeline

- `engine.capability.timeline.setRange(range)`
- `engine.capability.timeline.getRange()`
- `engine.capability.timeline.setCursor(cursor)`
- `engine.capability.timeline.getCursor()`
- `engine.capability.timeline.play(options)`
- `engine.capability.timeline.pause()`
- `engine.capability.timeline.stop()`
- `engine.capability.timeline.seek(time)`
- `engine.capability.timeline.setPlaybackRate(rate)`
- `engine.capability.timeline.getPlaybackState()`

## 5.6 Simulation And State Transition

- `engine.capability.simulation.initialize(state)`
- `engine.capability.simulation.reset(options)`
- `engine.capability.simulation.step(deltaTime)`
- `engine.capability.simulation.runSteps(count, deltaTime)`
- `engine.capability.simulation.setSeed(seed)`
- `engine.capability.simulation.setStatePatch(patch)`
- `engine.capability.simulation.queryState(query)`
- `engine.capability.simulation.snapshotState()`
- `engine.capability.simulation.restoreState(snapshot)`

## 5.7 Resource And Streaming

- `engine.capability.resource.load(assets)`
- `engine.capability.resource.preload(request)`
- `engine.capability.resource.unload(assetIds)`
- `engine.capability.resource.pin(assetIds)`
- `engine.capability.resource.unpin(assetIds)`
- `engine.capability.resource.setBudget(budget)`
- `engine.capability.resource.getBudgetState()`
- `engine.capability.resource.getAssetState(assetId)`
- `engine.capability.streaming.connect(endpoint)`
- `engine.capability.streaming.disconnect(connectionId)`
- `engine.capability.streaming.setBudget(budget)`
- `engine.capability.streaming.pushChunk(chunk)`
- `engine.capability.streaming.flush()`
- `engine.capability.streaming.getState()`

## 5.8 Render And Composition

- `engine.capability.render.renderFrame(request)`
- `engine.capability.render.renderRegion(request)`
- `engine.capability.render.invalidate(reason)`
- `engine.capability.render.pause()`
- `engine.capability.render.resume()`
- `engine.capability.render.setQuality(profile)`
- `engine.capability.render.setFrameBudget(budget)`
- `engine.capability.render.getLastFrameSummary()`
- `engine.capability.composition.setGraph(graph)`
- `engine.capability.composition.updateGraph(patch)`
- `engine.capability.composition.compose(request)`
- `engine.capability.composition.setLayerVisibility(input)`
- `engine.capability.composition.setLayerOrder(order)`

## 5.9 GPU Explicit

- `engine.capability.gpu.createResource(descriptor)`
- `engine.capability.gpu.updateResource(resourceId, update)`
- `engine.capability.gpu.destroyResource(resourceId)`
- `engine.capability.gpu.createUploadBatch(request)`
- `engine.capability.gpu.commitUploadBatch(batchId)`
- `engine.capability.gpu.createBarrierPlan(request)`
- `engine.capability.gpu.applyBarrierPlan(planId)`
- `engine.capability.gpu.submit(commandBuffer)`
- `engine.capability.gpu.submitBatch(commandBuffers)`
- `engine.capability.gpu.readback(request)`
- `engine.capability.gpu.getResourceState(resourceId)`

## 5.10 Backend And Session

- `engine.capability.session.mount(target)`
- `engine.capability.session.unmount()`
- `engine.capability.session.createHeadless(options)`
- `engine.capability.session.destroyHeadless(sessionId)`
- `engine.capability.session.renderHeadless(request)`
- `engine.capability.backend.setPreference(preference)`
- `engine.capability.backend.getInfo()`
- `engine.capability.backend.listAvailable()`
- `engine.capability.backend.getCapabilities()`
- `engine.capability.backend.switch(target, options)`

## 5.11 Data Field And Analysis

- `engine.capability.field.setScalarField(field)`
- `engine.capability.field.setVectorField(field)`
- `engine.capability.field.setTensorField(field)`
- `engine.capability.field.setTransferFunction(tf)`
- `engine.capability.field.setIsoValue(value)`
- `engine.capability.field.setSamplingPolicy(policy)`
- `engine.capability.field.probe(position)`
- `engine.capability.field.sampleLine(input)`
- `engine.capability.field.sampleVolume(input)`
- `engine.capability.field.computeHistogram(request)`

## 5.12 Geospatial

- `engine.capability.geo.setReference(reference)`
- `engine.capability.geo.getReference()`
- `engine.capability.geo.addTileset(tileset)`
- `engine.capability.geo.removeTileset(tilesetId)`
- `engine.capability.geo.setTilesetVisibility(input)`
- `engine.capability.geo.worldToGeo(point)`
- `engine.capability.geo.geoToWorld(position)`
- `engine.capability.geo.setCullingPolicy(policy)`
- `engine.capability.geo.queryVisibleTiles(query)`

## 5.13 Media And Multi-source

- `engine.capability.media.setSources(sources)`
- `engine.capability.media.addSource(source)`
- `engine.capability.media.removeSource(sourceId)`
- `engine.capability.media.setTimeline(timeline)`
- `engine.capability.media.play(options)`
- `engine.capability.media.pause()`
- `engine.capability.media.seek(time)`
- `engine.capability.media.renderAt(time)`
- `engine.capability.media.capture(options)`
- `engine.capability.media.getState()`

## 5.14 Collaboration Boundary

- `engine.capability.collaboration.setRemotePointers(pointers)`
- `engine.capability.collaboration.updateRemotePointer(pointerId, patch)`
- `engine.capability.collaboration.removeRemotePointer(pointerId)`
- `engine.capability.collaboration.setPresence(presence)`
- `engine.capability.collaboration.setSharedViewport(state)`
- `engine.capability.collaboration.setIssueMarkers(markers)`
- `engine.capability.collaboration.clear(scope)`

## 5.15 Diagnostics And Replay

- `engine.capability.diagnostics.getSummary()`
- `engine.capability.diagnostics.getMetrics()`
- `engine.capability.diagnostics.captureFrame(options)`
- `engine.capability.diagnostics.captureCommandTrace(options)`
- `engine.capability.diagnostics.captureResourceState(options)`
- `engine.capability.diagnostics.setEnabled(enabled)`
- `engine.capability.replay.createToken(scope)`
- `engine.capability.replay.validateToken(token)`
- `engine.capability.replay.run(token)`
- `engine.capability.replay.export(token)`

## 6. 与 2.3 场景映射的执行关系

1. 2.3 的 30 场景继续仅用于“能力组合验证”，不生成任何场景前缀 API。
2. L3（Capability API）是场景映射唯一可依赖 API 集。
3. L1/L2/L0 是 engine 基础能力与执行能力，不与场景语义绑定。
4. 新场景需求必须按“语义剥离流程”先映射到 L3，再决定是否需要补充 L1/L2/L0。

## 7. Contract 与文档落地清单

- 每个 API 条目必须补齐：
- Stability：`experimental` / `beta` / `stable`
- Level：`developer` / `advanced` / `foundation`
- Input schema
- Output schema
- Error codes
- Determinism constraints（如时间线/仿真/回放）
- Performance budget fields（如 frameBudget/queryBudget/uploadBudget）

- 每个能力包必须补齐三件套：
- `packages/engine/src/**/<name>.contract.ts`
- `packages/engine/docs/en/api/*.md` + `packages/engine/docs/cn/api/*.md`
- `packages/engine/src/testing/contract/*.test.ts`

## 8. 阻断规则（Full Surface 版）

1. API 不在 L0/L1/L2/L3 分类中：阻断。
2. API 命名包含行业语义：阻断。
3. 新增 API 无 contract 或无双语文档：阻断。
4. 新增 API 无错误语义/稳定性级别：阻断。
5. `engine.*`、`engine.runtime.*`、`engine.capability.*` 之外新增 public 命名空间：阻断。

## 9. 事件 API（补充完整定义）

说明：事件系统是大型渲染器稳定接入的核心机制，建议作为独立 contract 先冻结。

### 9.1 事件订阅控制

- `engine.events.on(type, listener, options)`
- `engine.events.off(type, listener)`
- `engine.events.once(type, listener, options)`
- `engine.events.onMany(types, listener, options)`
- `engine.events.offAll(scope)`
- `engine.events.pause(type)`
- `engine.events.resume(type)`
- `engine.events.getListenerStats()`

### 9.2 生命周期事件

- `engine.lifecycle.beforeMount`
- `engine.lifecycle.mounted`
- `engine.lifecycle.beforeUnmount`
- `engine.lifecycle.unmounted`
- `engine.lifecycle.ready`
- `engine.lifecycle.disposed`

### 9.3 场景与文档事件

- `engine.document.beforeSetGraph`
- `engine.document.graphSet`
- `engine.document.graphPatched`
- `engine.document.changeSetApplied`
- `engine.document.revisionChanged`
- `engine.document.validationFailed`

### 9.4 视图与交互事件

- `engine.view.changed`
- `engine.view.viewportResized`
- `engine.interaction.stateChanged`
- `engine.interaction.pickCompleted`
- `engine.interaction.pickFailed`
- `engine.interaction.hoverChanged`

### 9.5 渲染与帧事件

- `engine.render.frameRequested`
- `engine.render.frameStarted`
- `engine.render.frameCompleted`
- `engine.render.frameSkipped`
- `engine.render.frameFailed`
- `engine.render.qualityChanged`
- `engine.render.backendSwitched`

### 9.6 资源与流式事件

- `engine.resource.loadStarted`
- `engine.resource.loadProgress`
- `engine.resource.loadCompleted`
- `engine.resource.loadFailed`
- `engine.resource.evicted`
- `engine.streaming.connected`
- `engine.streaming.disconnected`
- `engine.streaming.chunkAccepted`
- `engine.streaming.backpressure`

### 9.7 诊断与错误事件

- `engine.diagnostics.warning`
- `engine.diagnostics.error`
- `engine.diagnostics.metrics`
- `engine.diagnostics.traceReady`
- `engine.diagnostics.captureReady`
- `engine.replay.started`
- `engine.replay.completed`
- `engine.replay.failed`

### 9.8 事件 contract 约束

1. 所有事件 payload 必须包含：`type`、`timestamp`、`engineId`、`revision`。
2. 事件发送顺序必须 deterministic（同输入、同 seed、同后端下保持一致）。
3. 高频事件必须支持采样或节流（例如 frame、metrics、pointer 类事件）。
4. 事件 listener 抛错不得中断引擎主流程，必须隔离并上报 diagnostics。
5. 事件命名统一为 domain.action 结构，禁止产品语义命名。

## 10. 除事件外建议补充的关键机制

### 10.1 扩展机制（Plugin/Extension）

- `engine.extension.register(plugin)`
- `engine.extension.unregister(pluginId)`
- `engine.extension.list()`
- `engine.extension.getState(pluginId)`

约束：插件只能访问公开 API，不得穿透 runtime 私有状态。

### 10.2 Hook 机制（阶段钩子）

- `engine.hooks.beforeCompile`
- `engine.hooks.afterCompile`
- `engine.hooks.beforeRenderPlan`
- `engine.hooks.afterRenderPlan`
- `engine.hooks.beforeSubmit`
- `engine.hooks.afterSubmit`

约束：hook 必须声明可重入性与副作用边界。

### 10.3 调度机制（Scheduler）

- `engine.scheduler.schedule(task, options)`
- `engine.scheduler.cancel(taskId)`
- `engine.scheduler.flush(queue)`
- `engine.scheduler.getQueueStats()`

约束：调度必须支持优先级、预算和饥饿保护。

### 10.4 缓存机制（Cache）

- `engine.cache.get(namespace, key)`
- `engine.cache.set(namespace, key, value, policy)`
- `engine.cache.invalidate(namespace, key)`
- `engine.cache.invalidateByTag(tag)`
- `engine.cache.getStats(namespace)`

约束：缓存失效必须与 dirty domain 对齐。

### 10.5 策略机制（Policy）

- `engine.policy.setRenderPolicy(policy)`
- `engine.policy.setResourcePolicy(policy)`
- `engine.policy.setFallbackPolicy(policy)`
- `engine.policy.getEffectivePolicy()`

约束：所有策略变更必须可观测并可回放。

### 10.6 安全与隔离机制（Security/Isolation）

- `engine.security.setTrustLevel(level)`
- `engine.security.setResourceAccessPolicy(policy)`
- `engine.security.getAuditLog(options)`

约束：外部输入必须经过 schema 校验与配额限制。

## 11. 大型渲染器产品文档常见分类（建议直接采用）

### 11.1 一级分类

1. Overview：定位、边界、术语与架构图。
2. Getting Started：安装、首帧、最小可运行示例。
3. Core Concepts：document/world/dirty/plan/command/backend 模型。
4. API Reference：Developer API、Runtime API、Capability API、Event API。
5. Runtime Internals：编译链路、调度、缓存、预算、确定性策略。
6. Rendering Pipeline：pass 图、命令编码、提交流程、回读。
7. Backends：WebGPU/WebGL/Canvas2D/Headless 能力矩阵与差异。
8. Interaction：picking、overlay、annotation、transform preview。
9. Resource And Streaming：加载、驻留、回收、流式与背压。
10. Diagnostics：metrics、trace、capture、replay、故障定位。
11. Performance：预算模型、压测基线、调优手册。
12. Migration：breaking changes、兼容移除、迁移脚本。
13. Security And Governance：输入校验、权限、CR 阻断规则。
14. FAQ And Troubleshooting：典型故障与修复路径。
15. Changelog And ADR：版本变更与架构决策记录。

### 11.2 二级分类建议

- API Reference 下固定四册：developer、runtime、capability、events。
- 每个 API 页面固定模板：用途、签名、输入、输出、错误、稳定性、预算、示例、相关事件。
- Backends 下固定三块：能力支持矩阵、行为差异、降级策略。
- Performance 下固定四块：指标定义、采样方式、预算阈值、回归门禁。

### 11.3 文档治理规则

1. 双语目录同构，路径和标题一一对应。
2. 任意 public API 变更必须同 PR 更新文档与测试。
3. 任意新增事件必须补充事件 payload schema 与顺序约束说明。
4. 所有示例必须只用抽象能力命名，不出现行业前缀 API。

## 12. 执行切片（主线开发版）

说明：本节把 Full Surface 需求切成可落地开发批次，避免一次性铺开导致 contract 漂移。

### 12.1 [CHANGE REQUEST] P0（首批冻结）

Target:

- File / Module:
  - `packages/engine/src/api/public-types.ts`
  - `packages/engine/src/api/createEngine.ts`
  - `packages/engine/src/api/runtimeCapabilityMap.ts`
  - `packages/engine/src/index.ts`
  - `packages/engine/src/testing/runtimeCapabilityMap.contract.test.ts`
  - `packages/engine/src/testing/runtimeExportResponsibilityMap.contract.test.mjs`

Goal:

- Problem being solved:
  - 将 runtime 能力从“文档约定”升级为“可编程 contract + diagnostics 自描述 + 契约测试门禁”。

Change Type:

- Add / Modify / Remove
  - Modify（以收敛为主）

Impact:

- Affected modules:

## 33. Batch-11 执行记录（Document 剩余 Foundation API 收口）

批次状态：DONE
批次日期：2026-05-21
批次负责人：copilot

### 33.1 Scope

1. 完成 Batch-1 follow-up：补齐 document 剩余 foundation API（diff/rebase/serialize/deserialize）。
2. 同步 runtime 实现、capability map、contract 测试、hard-cut 可调用测试与双语文档。

### 33.2 交付文件

1. Runtime 类型与实现：
   - `packages/engine/src/api/public-types.ts`
   - `packages/engine/src/api/createEngine.ts`
2. Foundation contract 与能力映射：
   - `packages/engine/src/runtime/document/document.foundation.contract.ts`
   - `packages/engine/src/api/runtimeCapabilityMap.ts`
3. 测试：
   - `packages/engine/src/testing/contract/document.foundation.runtime.contract.test.ts`
   - `packages/engine/src/testing/runtimeCapabilityMap.contract.test.ts`
   - `packages/engine/src/testing/createEngine.hard-cut.test.ts`
4. 文档（en/cn）：
   - `packages/engine/docs/en/api/runtime-document.md`
   - `packages/engine/docs/cn/api/runtime-document.md`

### 33.3 API 变更审计台账（Batch-11）

| API                                         | Contract Path                                                        | Test Path                                                                         | Doc EN                                          | Doc CN                                          | Stability | Level      | Status |
| ------------------------------------------- | -------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ----------------------------------------------- | ----------------------------------------------- | --------- | ---------- | ------ |
| engine.runtime.document.diffSnapshots       | packages/engine/src/runtime/document/document.foundation.contract.ts | packages/engine/src/testing/contract/document.foundation.runtime.contract.test.ts | packages/engine/docs/en/api/runtime-document.md | packages/engine/docs/cn/api/runtime-document.md | beta      | foundation | DONE   |
| engine.runtime.document.rebaseChangeSet     | packages/engine/src/runtime/document/document.foundation.contract.ts | packages/engine/src/testing/contract/document.foundation.runtime.contract.test.ts | packages/engine/docs/en/api/runtime-document.md | packages/engine/docs/cn/api/runtime-document.md | beta      | foundation | DONE   |
| engine.runtime.document.serializeSnapshot   | packages/engine/src/runtime/document/document.foundation.contract.ts | packages/engine/src/testing/contract/document.foundation.runtime.contract.test.ts | packages/engine/docs/en/api/runtime-document.md | packages/engine/docs/cn/api/runtime-document.md | beta      | foundation | DONE   |
| engine.runtime.document.deserializeSnapshot | packages/engine/src/runtime/document/document.foundation.contract.ts | packages/engine/src/testing/contract/document.foundation.runtime.contract.test.ts | packages/engine/docs/en/api/runtime-document.md | packages/engine/docs/cn/api/runtime-document.md | beta      | foundation | DONE   |

### 33.4 Validation

1. `pnpm --filter @venus/engine exec tsc --noEmit`：pass
2. `pnpm --filter @venus/engine test`：pass（75 tests）
3. `pnpm --filter @venus/engine run cr:check`：pass
4. `pnpm --filter @venus/vector-editor-web exec tsc --noEmit`：pass

### 33.5 Follow-up Closure

1. 已关闭历史未完成项：`document diff/rebase/serialize/deserialize`。
2. 当前主线剩余项：无。

## 34. Batch-12 执行记录（L0 Full Surface 收口：document/world/dirty/command/backend）

批次状态：DONE
批次日期：2026-05-21
批次负责人：copilot

### 34.1 Scope

1. 将 L0 五个基础域补齐到 Full Surface 清单口径：
   - document：`createSnapshot`、`validateSnapshot`
   - world：`compileFromDocument`、`queryEntity`、`queryComponent`、`clear`
   - dirty：`markBatch`、`getPendingDomains`、`flush`、`reset`
   - command：`createEncoder`、`optimize`、`inspect`、`replay`
   - backend：`select`、`getCapabilities`、`getLimits`、`probeHeadless`
2. 同步 runtime 类型/实现、foundation descriptor、capability map、contract/hard-cut tests、en/cn 文档。

### 34.2 交付文件

1. Runtime 类型与实现：
   - `packages/engine/src/api/public-types.ts`
   - `packages/engine/src/api/createEngine.ts`
2. Foundation descriptor：
   - `packages/engine/src/runtime/document/document.foundation.contract.ts`
   - `packages/engine/src/runtime/world/runtime-world.foundation.contract.ts`
   - `packages/engine/src/runtime/dirty/dirty.foundation.contract.ts`
   - `packages/engine/src/runtime/command/command-buffer.foundation.contract.ts`
   - `packages/engine/src/runtime/backend/backend.foundation.contract.ts`
3. Capability map：
   - `packages/engine/src/api/runtimeCapabilityMap.ts`
4. 测试：
   - `packages/engine/src/testing/contract/document.foundation.runtime.contract.test.ts`
   - `packages/engine/src/testing/contract/runtime-world.foundation.runtime.contract.test.ts`
   - `packages/engine/src/testing/contract/dirty.foundation.runtime.contract.test.ts`
   - `packages/engine/src/testing/contract/command-buffer.foundation.runtime.contract.test.ts`
   - `packages/engine/src/testing/contract/backend.foundation.runtime.contract.test.ts`
   - `packages/engine/src/testing/runtimeCapabilityMap.contract.test.ts`
   - `packages/engine/src/testing/createEngine.hard-cut.test.ts`
5. 文档（en/cn）：
   - `packages/engine/docs/en/api/runtime-document.md`
   - `packages/engine/docs/cn/api/runtime-document.md`
   - `packages/engine/docs/en/api/runtime-world.md`
   - `packages/engine/docs/cn/api/runtime-world.md`
   - `packages/engine/docs/en/api/runtime-dirty.md`
   - `packages/engine/docs/cn/api/runtime-dirty.md`
   - `packages/engine/docs/en/api/runtime-command.md`
   - `packages/engine/docs/cn/api/runtime-command.md`
   - `packages/engine/docs/en/api/runtime-backend.md`
   - `packages/engine/docs/cn/api/runtime-backend.md`

### 34.3 Validation

1. `pnpm --filter @venus/engine exec tsc --noEmit`：pass
2. `pnpm --filter @venus/engine test`：pass（75 tests）
3. `pnpm --filter @venus/engine run cr:check`：pass
4. `pnpm --filter @venus/vector-editor-web exec tsc --noEmit`：pass

## 35. Batch-13 执行记录（L1 Developer API 扩展实现）

批次状态：DONE
批次日期：2026-05-21
批次负责人：copilot

### 35.1 Scope

1. 扩展 `EngineHandle` Developer API，可调用覆盖生命周期、graph/view、overlay/interaction、asset/media、backend/session、events/metrics/replay 等 L1 入口。
2. 同步 `createEngine` 实现与 hard-cut API parity 测试，确保新增 API 可调用且行为稳定。

### 35.2 交付文件

1. Developer API 类型扩展：
   - `packages/engine/src/api/public-types.ts`
2. Developer API 运行时实现：
   - `packages/engine/src/api/createEngine.ts`
3. 集成可调用测试扩展：
   - `packages/engine/src/testing/createEngine.hard-cut.test.ts`

### 35.3 Validation

1. `pnpm --filter @venus/engine exec tsc --noEmit`：pass
2. `pnpm --filter @venus/engine test`：pass（75 tests）
3. `pnpm --filter @venus/engine run cr:check`：pass
4. `pnpm --filter @venus/vector-editor-web exec tsc --noEmit`：pass

## 36. Batch-14 执行记录（L2 Runtime Direct API 扩展实现）

批次状态：DONE
批次日期：2026-05-21
批次负责人：copilot

### 36.1 Scope

1. 扩展 `EngineRuntimeApi` 直连执行面，补齐 document/world/dirty/compile/plan/submit/gpu/spatial/backend/observability 的直接调用入口。
2. 在 `createEngine` 中接入全部 L2 直连方法，保持与已存在 `engine.runtime.*` namespace foundation API 同步可调用。
3. 增补 hard-cut 覆盖，验证 L2 直连方法可调用与关键返回结构稳定。

### 36.2 交付文件

1. L2 Runtime Direct API 类型扩展：
   - `packages/engine/src/api/public-types.ts`
2. L2 Runtime Direct API 运行时实现与接线：
   - `packages/engine/src/api/createEngine.ts`
3. 集成可调用测试扩展：
   - `packages/engine/src/testing/createEngine.hard-cut.test.ts`

### 36.3 Validation

1. `pnpm --filter @venus/engine exec tsc --noEmit`：pass
2. `pnpm --filter @venus/engine test`：pass（75 tests）
3. `pnpm --filter @venus/engine run cr:check`：pass
4. `pnpm --filter @venus/vector-editor-web exec tsc --noEmit`：pass

## 37. Batch-15 执行记录（L2 Runtime API 文档中英文同步）

批次状态：DONE
批次日期：2026-05-21
批次负责人：copilot

### 37.1 Scope

1. 对齐 `engine.runtime.*` 文档口径与当前 `EngineRuntimeApi` contract。
2. 将旧 Promise 风格文档切换为同步签名描述，覆盖 L2 直连 API 全分组（document/world、dirty/compile、plan/submit、gpu、spatial、backend、observability）。
3. 保留 runtime foundation namespace 说明，避免直连层与 foundation 层理解混淆。

### 37.2 交付文件

1. 英文 Runtime API 文档：
   - `packages/engine/docs/en/api/runtime-api.md`
2. 中文 Runtime API 文档：
   - `packages/engine/docs/cn/api/runtime-api.md`

### 37.3 Validation

1. `pnpm --filter @venus/engine run cr:check`：pass

## 38. Batch-16 执行记录（L3 Capability 首批公开面接入）

批次状态：DONE
批次日期：2026-05-21
批次负责人：copilot

### 38.1 Scope

1. 在 `EngineHandle` 暴露首批 L3 capability 公开命名空间。
2. 接入 spatial/picking/diagnostics/replay 四个 capability pack 的最小可调用实现。
3. 增补 hard-cut 可调用覆盖，验证 capability API 与现有 query/pick/raycast/diagnostics/replay 路径一致。

### 38.2 交付文件

1. Capability API 类型契约：
   - `packages/engine/src/api/public-types.ts`
2. Capability API 运行时接线：
   - `packages/engine/src/api/createEngine.ts`
3. Capability API 可调用测试：
   - `packages/engine/src/testing/createEngine.hard-cut.test.ts`

### 38.3 Validation

1. `pnpm --filter @venus/engine exec tsc --noEmit`：pass
2. `pnpm --filter @venus/engine test`：pass（75 tests）
3. `pnpm --filter @venus/engine run cr:check`：pass
4. `pnpm --filter @venus/vector-editor-web exec tsc --noEmit`：pass

## 39. Batch-17 执行记录（L3 Capability API 文档阶段化收口）

批次状态：DONE
批次日期：2026-05-21
批次负责人：copilot

### 39.1 Scope

1. 将 Capability API 文档从旧 Promise 风格收口到当前 `EngineCapabilityApi` 已实现接口。
2. 增加“已实现接口 / 规划能力包”双层结构，避免文档口径领先实现。
3. 保留 Full Surface 规划锚点（geometry/view/render 等）用于后续批次追踪。

### 39.2 交付文件

1. 英文 Capability API 文档：
   - `packages/engine/docs/en/api/capability-api.md`
2. 中文 Capability API 文档：
   - `packages/engine/docs/cn/api/capability-api.md`

### 39.3 Validation

1. `pnpm --filter @venus/engine run cr:check`：pass

## 40. Batch-18 执行记录（Helper Import Surface -> Formal Runtime/Capability API）

批次状态：DONE
批次日期：2026-05-21
批次负责人：copilot

### 40.1 Scope

1. 将应用侧请求的 helper 依赖项在 engine 内提供正式 API 对应面。
2. 按 `engine.runtime.*` / `engine.capability.*` 命名规则补齐 geometry payload、adaptive tolerance、node transform、svg transform、render scheduler control。
3. 回写请求文档，提供 1:1 迁移映射与使用示例。

### 40.2 交付文件

1. Runtime/Capability 类型契约扩展：
   - `packages/engine/src/api/public-types.ts`
2. Runtime/Capability 实现接线：
   - `packages/engine/src/api/createEngine.ts`
3. 可调用测试扩展：
   - `packages/engine/src/testing/createEngine.hard-cut.test.ts`
4. 请求文档回写（映射表 + 用法）：
   - `packages/engine/ai/request-helper-import-correction-2026-05-21.md`

### 40.3 Validation

1. `pnpm --filter @venus/engine exec tsc --noEmit`：pass
2. `pnpm --filter @venus/engine test`：pass
3. `pnpm --filter @venus/engine run cr:check`：pass
4. `pnpm --filter @venus/vector-editor-web exec tsc --noEmit`：pass

## 41. Batch-19 执行记录（Vector Bridge Helper Ownership Recovery）

批次状态：DONE
批次日期：2026-05-21
批次负责人：copilot

### 41.1 Scope

1. 清理 vector bridge 对 `@venus/engine` helper-style import 依赖。
2. 将 bridge helper 入口改为 formal runtime/capability API 包装层。
3. 将 render scheduler bridge 实现迁移为 `@venus/lib/scheduler` 本地包装，保持跨层职责边界。

### 41.2 交付文件

1. Vector engine bridge 改造：
   - `apps/vector-editor-web/src/runtime/engine-bridge/engine.ts`
2. 请求文档所有权决策与迁移状态回写：
   - `packages/engine/ai/request-helper-import-correction-2026-05-21.md`

### 41.3 Validation

1. `pnpm --filter @venus/engine exec tsc --noEmit`：pass
2. `pnpm --filter @venus/engine test`：pass
3. `pnpm --filter @venus/engine run cr:check`：pass
4. `pnpm --filter @venus/vector-editor-web exec tsc --noEmit`：pass

## 42. Batch-20 执行记录（Engine/Lib 导出治理，忽略 Playground）

批次状态：DONE
批次日期：2026-05-21
批次负责人：copilot

### 42.1 Scope

1. 按 runtime/capability-first 治理规则收紧 engine 顶层导出。
2. 移除 helper-style 顶层导出，避免 app 层绕过 formal API。
3. 明确 scheduler 归属到 lib，bridge 侧仅保留本地包装。

### 42.2 交付文件

1. Engine 顶层导出治理：
   - `packages/engine/src/index.ts`
2. 请求文档治理状态回写：
   - `packages/engine/ai/request-helper-import-correction-2026-05-21.md`

### 42.3 Validation

1. `pnpm --filter @venus/engine exec tsc --noEmit`：pass
2. `pnpm --filter @venus/engine test`：pass
3. `pnpm --filter @venus/engine run cr:check`：pass
4. `pnpm --filter @venus/vector-editor-web exec tsc --noEmit`：pass

## 43. Batch-21 执行记录（Vector 直接搜索归属改造 + 无用项删除）

批次状态：DONE
批次日期：2026-05-21
批次负责人：copilot

### 43.1 Scope

1. 在 vector 内直接搜索 helper 使用点并逐项归属判定（engine / lib / vector）。
2. 对“用得到”的项按归属改造实现路径。
3. 对“用不到”的项执行删除。
4. 显式忽略 playground。

### 43.2 交付文件

1. Vector bridge ownership refactor + unused deletion:
   - `apps/vector-editor-web/src/runtime/engine-bridge/engine.ts`
   - `apps/vector-editor-web/src/runtime/engine-bridge/engineExports.contract.ts`
2. 请求文档 usage audit 回写：
   - `packages/engine/ai/request-helper-import-correction-2026-05-21.md`

### 43.3 Validation

1. `pnpm --filter @venus/engine exec tsc --noEmit`：pass
2. `pnpm --filter @venus/engine test`：pass
3. `pnpm --filter @venus/engine run cr:check`：pass
4. `pnpm --filter @venus/vector-editor-web exec tsc --noEmit`：pass

- API contract
- runtime diagnostics
- top-level export governance
- contract test suite

Cleanup:

- Old logic to remove:
  - 不再依赖纯文档口径维护 runtime capability 稳定性信息。

Tests:

- Tests to add/update:
  - runtime capability map contract tests
  - diagnostics capability snapshot consistency tests
  - export responsibility mapping gate

### 12.2 P0 交付范围（已落地）

1. L1 Developer API（最小稳定面）：
   - `createEngine(options)`
   - `engine.setGraph(graph)`
   - `engine.updateGraph(patch)`
   - `engine.setView(view)`
   - `engine.render()`
   - `engine.pick(point, options)`
   - `engine.raycast(ray, options)`
   - `engine.query(bounds, options)`
   - `engine.setOverlays(overlays)`
   - `engine.invalidate(reason)`
   - `engine.getDiagnostics()`
   - `engine.getBackendInfo()`
   - `engine.dispose()`

2. L2 Runtime API（首批暴露）：
   - `engine.runtime.captureFrame(options)`（以 runtime shell captureFrame 与 diagnostics 链路为基）
   - `engine.runtime.getMetrics()`（以 getStats/getDiagnostics 聚合能力为基）

3. L3 Capability API（首批冻结）：
   - `engine.capability.spatial.query(query)`（映射 `query`）
   - `engine.capability.picking.pick(point, options)`（映射 `pick`）
   - `engine.capability.picking.raycast(ray, options)`（映射 `raycast`）
   - `engine.capability.diagnostics.getSummary()`（映射 `getDiagnostics`）

4. 已完成的 P0 治理件：
   - runtime capability map（含 stability/layer/entry/notes）
   - diagnostics 能力快照（含 `schemaVersion` + `runtime`）
   - top-level export responsibility gate（runtime/core/scenario）

### 12.3 P1 交付范围（下一批 contract 优先）

1. L0 Foundation 首批 contract 文件（先 contract，后实现）：
   - `document.foundation.contract.ts`
   - `runtime-world.foundation.contract.ts`
   - `dirty.foundation.contract.ts`
   - `command-buffer.foundation.contract.ts`
   - `backend.foundation.contract.ts`

2. P1 最小 API 冻结（建议先做 12 个）：
   - `engine.runtime.document.getRevision()`
   - `engine.runtime.document.getSchemaVersion()`
   - `engine.runtime.document.applyChangeSet(changeSet)`
   - `engine.runtime.world.getWorldSnapshot()`
   - `engine.runtime.world.getGraphStats()`
   - `engine.runtime.dirty.getState()`
   - `engine.runtime.dirty.mark(domain, token)`
   - `engine.runtime.command.encode(plan)`
   - `engine.runtime.command.validate(buffer)`
   - `engine.runtime.backend.listAvailable()`
   - `engine.runtime.backend.getActive()`
   - `engine.runtime.backend.getFallbackTrace()`

3. P1 阻断门禁：
   - 无 contract 定义不得实现 API。
   - 无 `docs/en` + `docs/cn` 同构页面不得合入。
   - 无 contract test 不得变更稳定级别。

### 12.4 P2 交付范围（Capability 扩展批）

1. 先扩展 capability，不直接扩展行业语义：
   - overlay/annotation
   - timeline/simulation
   - resource/streaming
   - gpu explicit
   - diagnostics/replay

2. 每个 capability 扩展必须带 4 个工件：
   - contract（types + error + stability）
   - developer/runtime/capability 映射说明
   - 双语 API 文档
   - deterministic contract test

## 13. Contract 模板（统一格式）

### 13.1 API 条目模板

- API Name:
- Level: developer / advanced / foundation
- Stability: experimental / beta / stable
- Input Schema:
- Output Schema:
- Error Codes:
- Determinism:
- Budget Fields:
- Related Events:
- Ownership: engine / lib / app-adapter

### 13.2 Error Code 命名约束

1. 统一前缀：`ENGINE_`。
2. 统一结构：`ENGINE_<DOMAIN>_<REASON>`。
3. 所有 public API 至少定义：
   - invalid input
   - unsupported backend/capability
   - deterministic guard violation（如 replay token 不一致）

### 13.3 Determinism 约束模板

1. 同输入、同 seed、同 backend：输出快照一致。
2. 事件发送顺序稳定。
3. query/pick/raycast 的排序字段固定（rank/distance/id 兜底）。
4. replay token 的 schemaVersion 不兼容时必须显式报错。

## 14. Full Surface 门禁与验收

### 14.1 合入前必跑

1. `pnpm --filter @venus/engine exec tsc -p tsconfig.json --noEmit`
2. `pnpm --filter @venus/engine test`
3. `pnpm --filter @venus/engine cr:check`

### 14.2 结构审计必过

1. 不新增行业语义命名空间。
2. 不新增 `engine.*` / `engine.runtime.*` / `engine.capability.*` 之外的 public namespace。
3. 导出职责映射测试必须覆盖新增导出。
4. runtime capability map 与 diagnostics 快照必须一致。

### 14.3 DoD（本文件维度）

1. Full Surface API 条目有分层归属（L0/L1/L2/L3）。
2. 每个新增 API 有 contract 模板字段，不是仅名称枚举。
3. 每个交付批次有明确阻断门禁与校验命令。
4. 文档可直接驱动实现，不依赖口头补充。

## 15. P1 逐文件任务卡（可直接开工）

说明：以下任务卡按“先 contract、再测试、后实现、最后文档”的顺序执行。

### 15.1 Task Card A：Document Foundation Contract

1. Target Files：
   - `packages/engine/src/runtime/document/document.foundation.contract.ts`
   - `packages/engine/src/testing/contract/document.foundation.contract.test.ts`
   - `packages/engine/docs/en/api/runtime-document.md`
   - `packages/engine/docs/cn/api/runtime-document.md`
2. Scope API：
   - `engine.runtime.document.getRevision()`
   - `engine.runtime.document.getSchemaVersion()`
   - `engine.runtime.document.applyChangeSet(changeSet)`
3. Contract 必填：
   - Input schema：`changeSet`、`baseRevision`、`schemaVersion`
   - Output schema：`nextRevision`、`appliedOps`、`warnings`
   - Error codes：`ENGINE_DOCUMENT_INVALID_CHANGESET`、`ENGINE_DOCUMENT_REVISION_CONFLICT`
   - Determinism：同 changeSet + 同 baseRevision 结果一致
4. 测试门禁：
   - revision 单调递增
   - schemaVersion mismatch 必须报错
   - 空 changeSet 行为固定（返回 no-op）

### 15.2 Task Card B：Runtime World Foundation Contract

1. Target Files：
   - `packages/engine/src/runtime/world/runtime-world.foundation.contract.ts`
   - `packages/engine/src/testing/contract/runtime-world.foundation.contract.test.ts`
   - `packages/engine/docs/en/api/runtime-world.md`
   - `packages/engine/docs/cn/api/runtime-world.md`
2. Scope API：
   - `engine.runtime.world.getWorldSnapshot()`
   - `engine.runtime.world.getGraphStats()`
3. Contract 必填：
   - Output schema：`worldRevision`、`entityCount`、`componentCounts`
   - Error codes：`ENGINE_WORLD_NOT_COMPILED`
   - Determinism：同 documentRevision 输出快照哈希一致
4. 测试门禁：
   - 空世界快照结构稳定
   - 多次读取无副作用
   - graph stats 字段完整且类型稳定

### 15.3 Task Card C：Dirty Foundation Contract

1. Target Files：
   - `packages/engine/src/runtime/dirty/dirty.foundation.contract.ts`
   - `packages/engine/src/testing/contract/dirty.foundation.contract.test.ts`
   - `packages/engine/docs/en/api/runtime-dirty.md`
   - `packages/engine/docs/cn/api/runtime-dirty.md`
2. Scope API：
   - `engine.runtime.dirty.getState()`
   - `engine.runtime.dirty.mark(domain, token)`
3. Contract 必填：
   - Input schema：`domain`（枚举）、`token`（string）
   - Output schema：`pendingDomains`、`lastMarkedAt`
   - Error codes：`ENGINE_DIRTY_INVALID_DOMAIN`
   - Determinism：mark 同序列输入输出集合一致
4. 测试门禁：
   - 重复 mark 的去重策略固定
   - flush 后 state 清空策略固定
   - 非法 domain 必须抛错

### 15.4 Task Card D：Command Buffer Foundation Contract

1. Target Files：
   - `packages/engine/src/runtime/command/command-buffer.foundation.contract.ts`
   - `packages/engine/src/testing/contract/command-buffer.foundation.contract.test.ts`
   - `packages/engine/docs/en/api/runtime-command.md`
   - `packages/engine/docs/cn/api/runtime-command.md`
2. Scope API：
   - `engine.runtime.command.encode(plan)`
   - `engine.runtime.command.validate(buffer)`
3. Contract 必填：
   - Input schema：`plan`、`validationProfile`
   - Output schema：`bufferId`、`commandCount`、`validationIssues`
   - Error codes：`ENGINE_COMMAND_INVALID_PLAN`、`ENGINE_COMMAND_VALIDATION_FAILED`
   - Determinism：同 plan 输出 command 序列一致
4. 测试门禁：
   - encode->validate 闭环通过
   - 非法 plan 返回稳定错误码
   - commandCount 与 plan item 数量映射规则固定

### 15.5 Task Card E：Backend Foundation Contract

1. Target Files：
   - `packages/engine/src/runtime/backend/backend.foundation.contract.ts`
   - `packages/engine/src/testing/contract/backend.foundation.contract.test.ts`
   - `packages/engine/docs/en/api/runtime-backend.md`
   - `packages/engine/docs/cn/api/runtime-backend.md`
2. Scope API：
   - `engine.runtime.backend.listAvailable()`
   - `engine.runtime.backend.getActive()`
   - `engine.runtime.backend.getFallbackTrace()`
3. Contract 必填：
   - Output schema：`available`、`active`、`fallbackTrace[]`
   - Error codes：`ENGINE_BACKEND_UNAVAILABLE`、`ENGINE_BACKEND_PROBE_FAILED`
   - Determinism：同探测条件 fallbackTrace 顺序一致
4. 测试门禁：
   - active backend 必须来自 available 列表
   - fallbackTrace 必须保留 requested/resolved/reason
   - headless 环境探测行为固定

## 16. P1 开发节奏与验收批次

### 16.1 批次顺序

1. Batch-1：Task Card A + C（document/dirty）
2. Batch-2：Task Card B（runtime world）
3. Batch-3：Task Card D + E（command/backend）

### 16.2 每批次固定输出

1. Contract 文件（类型注释完整）
2. Contract test（determinism + error code）
3. 双语 API 文档（en/cn 同构）
4. 回写本文件对应任务卡状态

### 16.3 每批次固定校验

1. `pnpm --filter @venus/engine exec tsc -p tsconfig.json --noEmit`
2. `pnpm --filter @venus/engine test`
3. `pnpm --filter @venus/engine cr:check`
4. `pnpm --filter @venus/vector-editor-web exec tsc -p tsconfig.app.json --noEmit`

## 17. Batch-1 当日执行单（Document + Dirty）

目标：在不扩散 API 面的前提下，完成 Task Card A/C 的 contract 冻结与测试落地。

批次状态：DONE
批次日期：2026-05-21
批次负责人：<owner>

### 17.1 执行顺序

1. 先建 contract 文件骨架：
   - `packages/engine/src/runtime/document/document.foundation.contract.ts`
   - `packages/engine/src/runtime/dirty/dirty.foundation.contract.ts`
2. 再建 contract test：
   - `packages/engine/src/testing/contract/document.foundation.contract.test.ts`
   - `packages/engine/src/testing/contract/dirty.foundation.contract.test.ts`
3. 再接入最小实现适配（仅映射已有能力，不扩展新语义）。
4. 最后补双语文档页并回写本文件状态。

### 17.1.1 当日时间盒（建议）

1. 09:00-10:30：contract skeleton + 字段注释冻结。
2. 10:30-12:00：contract test 首轮（允许红灯）。
3. 13:30-15:30：最小实现映射 + 测试转绿。
4. 15:30-16:30：docs/en + docs/cn 同构补齐。
5. 16:30-17:00：回写本文件 + 执行校验命令。

### 17.2 提交边界（建议）

1. Commit-1：仅 contract 类型定义（无行为改动）。
2. Commit-2：仅 contract test（允许先红后绿）。
3. Commit-3：最小实现对齐 + 测试转绿。
4. Commit-4：docs/en + docs/cn 与本文件回写。

### 17.3 阻断条件

1. contract 未冻结前禁止实现 API 行为。
2. error code 未定义前禁止抛裸字符串错误。
3. determinism 断言未补前禁止合入 runtime API。
4. docs/en 与 docs/cn 任一缺失即阻断。

### 17.4 完成判定

- [x] `engine.runtime.document.getRevision()` contract + test + docs 完成
- [x] `engine.runtime.document.getSchemaVersion()` contract + test + docs 完成
- [x] `engine.runtime.document.applyChangeSet(changeSet)` contract + test + docs 完成
- [x] `engine.runtime.dirty.getState()` contract + test + docs 完成
- [x] `engine.runtime.dirty.mark(domain, token)` contract + test + docs 完成
- [x] engine/vector 校验命令全绿

### 17.5 任务状态看板（Batch-1）

| ID    | Item                                                              | Owner   | Status | Evidence                                                                                          |
| ----- | ----------------------------------------------------------------- | ------- | ------ | ------------------------------------------------------------------------------------------------- |
| B1-A1 | document.foundation.contract.ts 建立并冻结字段                    | copilot | DONE   | packages/engine/src/runtime/document/document.foundation.contract.ts                              |
| B1-A2 | document foundation contract tests 覆盖 revision/schema/conflict  | copilot | DONE   | packages/engine/src/testing/contract/document.foundation.runtime.contract.test.ts                 |
| B1-A3 | runtime-document en/cn 文档同构                                   | copilot | DONE   | packages/engine/docs/en/api/runtime-document.md + packages/engine/docs/cn/api/runtime-document.md |
| B1-C1 | dirty.foundation.contract.ts 建立并冻结字段                       | copilot | DONE   | packages/engine/src/runtime/dirty/dirty.foundation.contract.ts                                    |
| B1-C2 | dirty foundation contract tests 覆盖 mark/getState/invalid domain | copilot | DONE   | packages/engine/src/testing/contract/dirty.foundation.runtime.contract.test.ts                    |
| B1-C3 | runtime-dirty en/cn 文档同构                                      | copilot | DONE   | packages/engine/docs/en/api/runtime-dirty.md + packages/engine/docs/cn/api/runtime-dirty.md       |
| B1-G1 | 四项校验命令全绿                                                  | copilot | DONE   | engine tsc/test/cr:check + vector tsc passed                                                      |

## 18. 风险与回滚策略（P1）

### 18.1 主要风险

1. API 命名漂移：runtime contract 与 capability mapping 命名不一致。
2. 错误语义漂移：同类错误返回不同 error code。
3. 文档漂移：docs 与 contract 字段不一致。
4. 测试漂移：只测 happy path，未覆盖 determinism 与冲突场景。

### 18.1.1 风险分级矩阵

| 风险ID          | 级别   | 触发信号                                  | 立即动作                                 |
| --------------- | ------ | ----------------------------------------- | ---------------------------------------- |
| R-API-DRIFT     | High   | contract 名称与 capability map 名称不一致 | 暂停实现，先修 contract 命名并补对齐测试 |
| R-ERR-DRIFT     | High   | 同类异常出现多个 error code               | 错误码归一，回滚新增分叉 code            |
| R-DOC-DRIFT     | Medium | docs 字段少于 contract 字段               | 阻断合入，先补文档同构                   |
| R-TEST-GAP      | High   | 无 determinism/assertion                  | 阻断合入，先补测试                       |
| R-VECTOR-IMPACT | High   | vector tsc fail                           | 回滚 public 变更，仅保留内部适配         |

### 18.2 回滚原则

1. 一旦出现 schema 字段不兼容：优先回滚实现层，保留 contract 草案。
2. 一旦出现错误码冲突：回滚新增错误码，恢复上一版稳定错误集。
3. 一旦 vector 侧编译受影响：回滚新增 public 导出，改走内部适配过渡。
4. 回滚后必须在本文件记录“原因/范围/下次进入条件”。

### 18.2.1 回滚决策闸门

1. 若影响 public contract 字段：必须触发回滚。
2. 若仅影响内部实现且 contract 不变：允许热修。
3. 若 engine 绿而 vector 红：按 public 兼容性问题处理，优先回滚。
4. 若 determinism 断言不稳定：暂停批次推进，先恢复稳定基线。

### 18.3 回滚记录模板

- 回滚时间：
- 回滚范围：
- 触发原因：
- 影响 API：
- 已恢复校验：
- 下次恢复前置条件：

## 19. 批次回写模板（每批次都填）

```markdown
## Batch-X 回写（YYYY-MM-DD）

### A. Scope

1. 完成任务卡：<A/B/C/D/E>
2. 本批 API：<list>

### B. Contract

1. 新增 contract 文件：<paths>
2. 冻结字段：<key fields>
3. 错误码：<codes>

### C. Test

1. 新增测试：<paths>
2. Determinism 断言：<summary>
3. 边界错误断言：<summary>

### D. Docs

1. en：<paths>
2. cn：<paths>
3. 同构检查：pass/fail

### E. Validation

1. engine tsc：pass/fail
2. engine test：pass/fail
3. engine cr:check：pass/fail
4. vector tsc：pass/fail

### F. Risks / Follow-ups

1. 未完成项：<items>
2. 下一批入口条件：<conditions>
```

### 19.1 Batch-1 回写示例（可直接复制改值）

```markdown
## Batch-1 回写（2026-05-21）

### A. Scope

1. 完成任务卡：A, C
2. 本批 API：
   - engine.runtime.document.getRevision
   - engine.runtime.document.getSchemaVersion
   - engine.runtime.document.applyChangeSet
   - engine.runtime.dirty.getState
   - engine.runtime.dirty.mark

### B. Contract

1. 新增 contract 文件：
   - packages/engine/src/runtime/document/document.foundation.contract.ts
   - packages/engine/src/runtime/dirty/dirty.foundation.contract.ts
2. 冻结字段：revision, schemaVersion, changeSet, domain, token
3. 错误码：ENGINE_DOCUMENT_INVALID_CHANGESET, ENGINE_DOCUMENT_REVISION_CONFLICT, ENGINE_DIRTY_INVALID_DOMAIN

### C. Test

1. 新增测试：
   - packages/engine/src/testing/contract/document.foundation.runtime.contract.test.ts
   - packages/engine/src/testing/contract/dirty.foundation.runtime.contract.test.ts
2. Determinism 断言：同输入多次执行输出一致
3. 边界错误断言：invalid input / revision conflict / invalid domain

### D. Docs

1. en：
   - packages/engine/docs/en/api/runtime-document.md
   - packages/engine/docs/en/api/runtime-dirty.md
2. cn：
   - packages/engine/docs/cn/api/runtime-document.md
   - packages/engine/docs/cn/api/runtime-dirty.md
3. 同构检查：pass

### E. Validation

1. engine tsc：pass
2. engine test：pass
3. engine cr:check：pass
4. vector tsc：pass

### F. Risks / Follow-ups

1. 未完成项：document diff/rebase/serialize/deserialize 未进入本批
2. 下一批入口条件：Batch-1 全绿且 docs 同构审计通过
```

## 20. Batch-1 开工前检查（Kickoff Checklist）

### 20.1 输入物检查

- [x] Task Card A/C 范围确认（仅 document + dirty）
- [x] 本批 API 列表冻结（不临时加项）
- [x] 错误码候选集冻结（不临时改名）
- [x] docs/en 与 docs/cn 页面路径预创建
- [x] contract test 文件命名与路径确认

### 20.2 口径检查

- [x] API 命名仅使用 `engine.*` / `engine.runtime.*` / `engine.capability.*`
- [x] 不引入行业语义前缀
- [x] 每个 API 至少具备 input/output/error/determinism 字段
- [x] 可观测字段命名与 diagnostics 口径一致

### 20.3 校验基线

- [x] `pnpm --filter @venus/engine exec tsc -p tsconfig.json --noEmit` 基线通过
- [x] `pnpm --filter @venus/engine test` 基线通过
- [x] `pnpm --filter @venus/engine cr:check` 基线通过
- [x] `pnpm --filter @venus/vector-editor-web exec tsc -p tsconfig.app.json --noEmit` 基线通过

## 21. Batch-1 并行协作规则

### 21.1 分工建议

1. 开发位 A：contract 文件（document + dirty）。
2. 开发位 B：contract tests（document + dirty）。
3. 开发位 C：docs/en + docs/cn 同构页。
4. 集成位 D：实现映射 + 最终校验 + 回写。

### 21.2 合并顺序

1. 先合并 contract（A）。
2. 再合并 tests（B）。
3. 再合并实现映射（D）。
4. 最后合并 docs 与回写（C + D）。

### 21.3 冲突处理

1. contract 字段冲突：以 Task Card 字段冻结表为准。
2. error code 冲突：以 Error Code 命名约束为准。
3. docs 冲突：以 contract 字段为源，文档只做镜像。
4. 测试冲突：优先保留 determinism 与错误码断言。

## 22. API 变更审计台账（Batch-1）

| API                                      | Contract Path                                                        | Test Path                                                                         | Doc EN                                          | Doc CN                                          | Stability | Level      | Status |
| ---------------------------------------- | -------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ----------------------------------------------- | ----------------------------------------------- | --------- | ---------- | ------ |
| engine.runtime.document.getRevision      | packages/engine/src/runtime/document/document.foundation.contract.ts | packages/engine/src/testing/contract/document.foundation.runtime.contract.test.ts | packages/engine/docs/en/api/runtime-document.md | packages/engine/docs/cn/api/runtime-document.md | beta      | foundation | DONE   |
| engine.runtime.document.getSchemaVersion | packages/engine/src/runtime/document/document.foundation.contract.ts | packages/engine/src/testing/contract/document.foundation.runtime.contract.test.ts | packages/engine/docs/en/api/runtime-document.md | packages/engine/docs/cn/api/runtime-document.md | beta      | foundation | DONE   |
| engine.runtime.document.applyChangeSet   | packages/engine/src/runtime/document/document.foundation.contract.ts | packages/engine/src/testing/contract/document.foundation.runtime.contract.test.ts | packages/engine/docs/en/api/runtime-document.md | packages/engine/docs/cn/api/runtime-document.md | beta      | foundation | DONE   |
| engine.runtime.dirty.getState            | packages/engine/src/runtime/dirty/dirty.foundation.contract.ts       | packages/engine/src/testing/contract/dirty.foundation.runtime.contract.test.ts    | packages/engine/docs/en/api/runtime-dirty.md    | packages/engine/docs/cn/api/runtime-dirty.md    | beta      | foundation | DONE   |
| engine.runtime.dirty.mark                | packages/engine/src/runtime/dirty/dirty.foundation.contract.ts       | packages/engine/src/testing/contract/dirty.foundation.runtime.contract.test.ts    | packages/engine/docs/en/api/runtime-dirty.md    | packages/engine/docs/cn/api/runtime-dirty.md    | beta      | foundation | DONE   |

说明：状态流转使用 `TODO -> IN_PROGRESS -> DONE`，每次状态变化必须同步更新第 17.5 看板与第 19 节回写块。

## 23. Batch-2 执行记录（Runtime World）

批次状态：DONE
批次日期：2026-05-21
批次负责人：copilot

### 23.1 Scope

1. Task Card：B
2. API：
   - `engine.runtime.world.getWorldSnapshot()`
   - `engine.runtime.world.getGraphStats()`

### 23.2 交付文件

1. Contract：
   - `packages/engine/src/runtime/world/runtime-world.foundation.contract.ts`
2. Test：
   - `packages/engine/src/testing/contract/runtime-world.foundation.runtime.contract.test.ts`
3. Docs（en/cn）：
   - `packages/engine/docs/en/api/runtime-world.md`
   - `packages/engine/docs/cn/api/runtime-world.md`

### 23.3 任务状态看板（Batch-2）

| ID    | Item                                                           | Owner   | Status | Evidence                                                                                    |
| ----- | -------------------------------------------------------------- | ------- | ------ | ------------------------------------------------------------------------------------------- |
| B2-B1 | runtime-world.foundation.contract.ts 建立并冻结字段            | copilot | DONE   | packages/engine/src/runtime/world/runtime-world.foundation.contract.ts                      |
| B2-B2 | runtime world contract tests 覆盖 descriptor/error/determinism | copilot | DONE   | packages/engine/src/testing/contract/runtime-world.foundation.runtime.contract.test.ts      |
| B2-B3 | runtime-world en/cn 文档同构                                   | copilot | DONE   | packages/engine/docs/en/api/runtime-world.md + packages/engine/docs/cn/api/runtime-world.md |
| B2-G1 | 四项校验命令全绿                                               | copilot | DONE   | engine tsc/test/cr:check + vector tsc passed                                                |

### 23.4 API 变更审计台账（Batch-2）

| API                                   | Contract Path                                                          | Test Path                                                                              | Doc EN                                       | Doc CN                                       | Stability | Level      | Status |
| ------------------------------------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | -------------------------------------------- | -------------------------------------------- | --------- | ---------- | ------ |
| engine.runtime.world.getWorldSnapshot | packages/engine/src/runtime/world/runtime-world.foundation.contract.ts | packages/engine/src/testing/contract/runtime-world.foundation.runtime.contract.test.ts | packages/engine/docs/en/api/runtime-world.md | packages/engine/docs/cn/api/runtime-world.md | beta      | foundation | DONE   |
| engine.runtime.world.getGraphStats    | packages/engine/src/runtime/world/runtime-world.foundation.contract.ts | packages/engine/src/testing/contract/runtime-world.foundation.runtime.contract.test.ts | packages/engine/docs/en/api/runtime-world.md | packages/engine/docs/cn/api/runtime-world.md | beta      | foundation | DONE   |

## 24. Batch-3 执行记录（Command + Backend）

批次状态：DONE
批次日期：2026-05-21
批次负责人：copilot

### 24.1 Scope

1. Task Card：D, E
2. API：
   - `engine.runtime.command.encode(plan)`
   - `engine.runtime.command.validate(buffer)`
   - `engine.runtime.backend.listAvailable()`
   - `engine.runtime.backend.getActive()`
   - `engine.runtime.backend.getFallbackTrace()`

### 24.2 交付文件

1. Contract：
   - `packages/engine/src/runtime/command/command-buffer.foundation.contract.ts`
   - `packages/engine/src/runtime/backend/backend.foundation.contract.ts`
2. Test：
   - `packages/engine/src/testing/contract/command-buffer.foundation.runtime.contract.test.ts`
   - `packages/engine/src/testing/contract/backend.foundation.runtime.contract.test.ts`
3. Docs（en/cn）：
   - `packages/engine/docs/en/api/runtime-command.md`
   - `packages/engine/docs/cn/api/runtime-command.md`
   - `packages/engine/docs/en/api/runtime-backend.md`
   - `packages/engine/docs/cn/api/runtime-backend.md`

### 24.3 任务状态看板（Batch-3）

| ID    | Item                                                                | Owner   | Status | Evidence                                                                                        |
| ----- | ------------------------------------------------------------------- | ------- | ------ | ----------------------------------------------------------------------------------------------- |
| B3-D1 | command-buffer.foundation.contract.ts 建立并冻结字段                | copilot | DONE   | packages/engine/src/runtime/command/command-buffer.foundation.contract.ts                       |
| B3-D2 | command foundation contract tests 覆盖 descriptor/error/determinism | copilot | DONE   | packages/engine/src/testing/contract/command-buffer.foundation.runtime.contract.test.ts         |
| B3-D3 | runtime-command en/cn 文档同构                                      | copilot | DONE   | packages/engine/docs/en/api/runtime-command.md + packages/engine/docs/cn/api/runtime-command.md |
| B3-E1 | backend.foundation.contract.ts 建立并冻结字段                       | copilot | DONE   | packages/engine/src/runtime/backend/backend.foundation.contract.ts                              |
| B3-E2 | backend foundation contract tests 覆盖 descriptor/error/determinism | copilot | DONE   | packages/engine/src/testing/contract/backend.foundation.runtime.contract.test.ts                |
| B3-E3 | runtime-backend en/cn 文档同构                                      | copilot | DONE   | packages/engine/docs/en/api/runtime-backend.md + packages/engine/docs/cn/api/runtime-backend.md |
| B3-G1 | 四项校验命令全绿                                                    | copilot | DONE   | engine tsc/test/cr:check + vector tsc passed                                                    |

### 24.4 API 变更审计台账（Batch-3）

| API                                     | Contract Path                                                             | Test Path                                                                               | Doc EN                                         | Doc CN                                         | Stability | Level      | Status |
| --------------------------------------- | ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ---------------------------------------------- | ---------------------------------------------- | --------- | ---------- | ------ |
| engine.runtime.command.encode           | packages/engine/src/runtime/command/command-buffer.foundation.contract.ts | packages/engine/src/testing/contract/command-buffer.foundation.runtime.contract.test.ts | packages/engine/docs/en/api/runtime-command.md | packages/engine/docs/cn/api/runtime-command.md | beta      | foundation | DONE   |
| engine.runtime.command.validate         | packages/engine/src/runtime/command/command-buffer.foundation.contract.ts | packages/engine/src/testing/contract/command-buffer.foundation.runtime.contract.test.ts | packages/engine/docs/en/api/runtime-command.md | packages/engine/docs/cn/api/runtime-command.md | beta      | foundation | DONE   |
| engine.runtime.backend.listAvailable    | packages/engine/src/runtime/backend/backend.foundation.contract.ts        | packages/engine/src/testing/contract/backend.foundation.runtime.contract.test.ts        | packages/engine/docs/en/api/runtime-backend.md | packages/engine/docs/cn/api/runtime-backend.md | beta      | foundation | DONE   |
| engine.runtime.backend.getActive        | packages/engine/src/runtime/backend/backend.foundation.contract.ts        | packages/engine/src/testing/contract/backend.foundation.runtime.contract.test.ts        | packages/engine/docs/en/api/runtime-backend.md | packages/engine/docs/cn/api/runtime-backend.md | beta      | foundation | DONE   |
| engine.runtime.backend.getFallbackTrace | packages/engine/src/runtime/backend/backend.foundation.contract.ts        | packages/engine/src/testing/contract/backend.foundation.runtime.contract.test.ts        | packages/engine/docs/en/api/runtime-backend.md | packages/engine/docs/cn/api/runtime-backend.md | beta      | foundation | DONE   |

## 25. Batch-4 执行记录（Runtime Namespace 可调用接入）

批次状态：DONE
批次日期：2026-05-21
批次负责人：copilot

### 25.1 Scope

1. 将 Batch-1/2/3 foundation API 从“contract+test+docs”推进到 `EngineHandle.runtime` 可调用实现。
2. 保持 engine top-level 职责边界，不新增行业语义导出。

### 25.2 交付文件

1. Runtime 类型接入：
   - `packages/engine/src/api/public-types.ts`
2. Runtime 实现接入：
   - `packages/engine/src/api/createEngine.ts`
3. 可调用集成测试：
   - `packages/engine/src/testing/createEngine.hard-cut.test.ts`

### 25.3 API 接入范围

1. `engine.runtime.document.getRevision()`
2. `engine.runtime.document.getSchemaVersion()`
3. `engine.runtime.document.applyChangeSet(input)`
4. `engine.runtime.world.getWorldSnapshot()`
5. `engine.runtime.world.getGraphStats()`
6. `engine.runtime.dirty.getState()`
7. `engine.runtime.dirty.mark(input)`
8. `engine.runtime.command.encode(plan)`
9. `engine.runtime.command.validate(buffer)`
10. `engine.runtime.backend.listAvailable()`
11. `engine.runtime.backend.getActive()`
12. `engine.runtime.backend.getFallbackTrace()`

### 25.4 任务状态看板（Batch-4）

| ID    | Item                                                                 | Owner   | Status | Evidence                                                  |
| ----- | -------------------------------------------------------------------- | ------- | ------ | --------------------------------------------------------- |
| B4-A1 | EngineHandle runtime 命名空间类型契约接入                            | copilot | DONE   | packages/engine/src/api/public-types.ts                   |
| B4-A2 | createEngine runtime/document/world/dirty/command/backend 可调用实现 | copilot | DONE   | packages/engine/src/api/createEngine.ts                   |
| B4-A3 | hard-cut 测试增加 runtime namespace 可调用断言                       | copilot | DONE   | packages/engine/src/testing/createEngine.hard-cut.test.ts |
| B4-G1 | 四项校验命令全绿                                                     | copilot | DONE   | engine tsc/test/cr:check + vector tsc passed              |

### 25.5 Validation

1. `pnpm --filter @venus/engine exec tsc -p tsconfig.json --noEmit`：pass
2. `pnpm --filter @venus/engine test`：pass
3. `pnpm --filter @venus/engine cr:check`：pass
4. `pnpm --filter @venus/vector-editor-web exec tsc -p tsconfig.app.json --noEmit`：pass

## 26. Batch-7 执行记录（Capability-Foundation 自动一致性校验）

批次状态：DONE
批次日期：2026-05-21
批次负责人：copilot

### 29.1 Scope

1. 将 runtime capability map 与所有已落地 foundation descriptor 建立自动一致性断言。
2. 保证后续新增 foundation endpoint 若未同步 capability map 将在测试阶段直接阻断。

### 29.2 交付文件

1. 一致性测试增强：
   - `packages/engine/src/testing/runtimeCapabilityMap.contract.test.ts`

### 29.3 任务状态看板（Batch-7）

| ID    | Item                                                   | Owner   | Status | Evidence                                                          |
| ----- | ------------------------------------------------------ | ------- | ------ | ----------------------------------------------------------------- |
| B7-A1 | foundation descriptor -> capability entry 自动映射校验 | copilot | DONE   | packages/engine/src/testing/runtimeCapabilityMap.contract.test.ts |
| B7-A2 | runtime capability map 测试增加漏配阻断断言            | copilot | DONE   | packages/engine/src/testing/runtimeCapabilityMap.contract.test.ts |
| B7-V1 | 四项校验命令全绿                                       | copilot | DONE   | engine tsc/test/cr:check + vector tsc passed                      |

### 29.4 Validation

1. `pnpm --filter @venus/engine exec node --import tsx --test src/testing/runtimeCapabilityMap.contract.test.ts`：pass
2. `pnpm --filter @venus/engine exec tsc -p tsconfig.json --noEmit`：pass
3. `pnpm --filter @venus/engine test`：pass
4. `pnpm --filter @venus/engine cr:check`：pass
5. `pnpm --filter @venus/vector-editor-web exec tsc -p tsconfig.app.json --noEmit`：pass

## 32. Batch-10 执行记录（Capability 反向约束 + 文档一致性）

批次状态：DONE
批次日期：2026-05-21
批次负责人：copilot

### 32.1 Scope

1. 增加 capability 反向约束：每个 capability entry 必须要么属于 foundation descriptor 派生集合，要么属于显式 non-foundation 白名单。
2. 修正文档一致性：Batch-1 状态回正、章节序号在当前文件内按递增排列。

### 32.2 交付文件

1. 共享对齐模块增强：
   - `packages/engine/src/testing/runtimeCapabilityFoundationAlignment.ts`
2. 合约测试增强：
   - `packages/engine/src/testing/runtimeCapabilityMap.contract.test.ts`
3. 执行文档一致性修正：
   - `ai/operations/engine-api-requirements-full-surface-from-capability-mapping-2026-05-21.md`

### 32.3 任务状态看板（Batch-10）

| ID     | Item                                                   | Owner   | Status | Evidence                                                                                 |
| ------ | ------------------------------------------------------ | ------- | ------ | ---------------------------------------------------------------------------------------- |
| B10-R1 | capability 反向约束（foundation-or-whitelist）校验落地 | copilot | DONE   | packages/engine/src/testing/runtimeCapabilityMap.contract.test.ts                        |
| B10-R2 | non-foundation capability 白名单与逆向差异计算逻辑落地 | copilot | DONE   | packages/engine/src/testing/runtimeCapabilityFoundationAlignment.ts                      |
| B10-D1 | Batch-1 状态与章节序号一致性修正                       | copilot | DONE   | ai/operations/engine-api-requirements-full-surface-from-capability-mapping-2026-05-21.md |
| B10-V1 | 四项校验命令全绿                                       | copilot | DONE   | engine tsc/test/cr:check + vector tsc passed                                             |

### 32.4 Validation

1. `pnpm --filter @venus/engine exec node --import tsx --test src/testing/runtimeCapabilityMap.contract.test.ts`：pass（8 tests）
2. `pnpm --filter @venus/engine exec tsc -p tsconfig.json --noEmit`：pass
3. `pnpm --filter @venus/engine test`：pass（75 tests）
4. `pnpm --filter @venus/engine cr:check`：pass
5. `pnpm --filter @venus/vector-editor-web exec tsc -p tsconfig.app.json --noEmit`：pass

## 27. Batch-8 执行记录（Capability 单一声明源收敛）

批次状态：DONE
批次日期：2026-05-21
批次负责人：copilot

### 30.1 Scope

1. 将 capability map 的声明源收敛为单一 registry，避免类型/映射双处手工维护。
2. 保持 capability map、runtime diagnostics snapshot、foundation 一致性测试链路持续有效。

### 30.2 交付文件

1. 单源重构：
   - `packages/engine/src/api/runtimeCapabilityMap.ts`
2. 合约测试增强：
   - `packages/engine/src/testing/runtimeCapabilityMap.contract.test.ts`
3. 顶层责任映射更新：
   - `packages/engine/src/testing/runtimeExportResponsibilityMap.contract.test.mjs`
4. 顶层导出补齐：
   - `packages/engine/src/index.ts`

### 30.3 任务状态看板（Batch-8）

| ID    | Item                                                       | Owner   | Status | Evidence                                                                     |
| ----- | ---------------------------------------------------------- | ------- | ------ | ---------------------------------------------------------------------------- |
| B8-S1 | capability registry 成为单一声明源并自动派生 map           | copilot | DONE   | packages/engine/src/api/runtimeCapabilityMap.ts                              |
| B8-S2 | registry 唯一性与 map 镜像一致性测试                       | copilot | DONE   | packages/engine/src/testing/runtimeCapabilityMap.contract.test.ts            |
| B8-S3 | 新增顶层导出 `ENGINE_RUNTIME_CAPABILITY_REGISTRY` 责任映射 | copilot | DONE   | packages/engine/src/testing/runtimeExportResponsibilityMap.contract.test.mjs |
| B8-V1 | 四项校验命令全绿                                           | copilot | DONE   | engine tsc/test/cr:check + vector tsc passed                                 |

### 30.4 Validation

1. `pnpm --filter @venus/engine exec node --import tsx --test src/testing/runtimeCapabilityMap.contract.test.ts`：pass
2. `pnpm --filter @venus/engine exec tsc -p tsconfig.json --noEmit`：pass
3. `pnpm --filter @venus/engine test`：pass（74 tests）
4. `pnpm --filter @venus/engine cr:check`：pass
5. `pnpm --filter @venus/vector-editor-web exec tsc -p tsconfig.app.json --noEmit`：pass

## 28. Batch-9 执行记录（Capability-Foundation 共享校验模块）

批次状态：DONE
批次日期：2026-05-21
批次负责人：copilot

### 31.1 Scope

1. 抽取 capability/foundation 对齐规则为共享模块，减少测试内重复聚合与映射逻辑。
2. 保持现有漏配阻断能力不变，并使后续测试可直接复用该规则模块。

### 31.2 交付文件

1. 新增共享模块：
   - `packages/engine/src/testing/runtimeCapabilityFoundationAlignment.ts`
2. 测试重构：
   - `packages/engine/src/testing/runtimeCapabilityMap.contract.test.ts`

### 31.3 任务状态看板（Batch-9）

| ID    | Item                                                       | Owner   | Status | Evidence                                                            |
| ----- | ---------------------------------------------------------- | ------- | ------ | ------------------------------------------------------------------- |
| B9-R1 | 抽取 foundation descriptor 聚合与 entry 映射规则到共享模块 | copilot | DONE   | packages/engine/src/testing/runtimeCapabilityFoundationAlignment.ts |
| B9-R2 | runtimeCapabilityMap 合约测试改用共享模块并保持漏配阻断    | copilot | DONE   | packages/engine/src/testing/runtimeCapabilityMap.contract.test.ts   |
| B9-V1 | 四项校验命令全绿                                           | copilot | DONE   | engine tsc/test/cr:check + vector tsc passed                        |

### 31.4 Validation

1. `pnpm --filter @venus/engine exec node --import tsx --test src/testing/runtimeCapabilityMap.contract.test.ts`：pass
2. `pnpm --filter @venus/engine exec tsc -p tsconfig.json --noEmit`：pass
3. `pnpm --filter @venus/engine test`：pass
4. `pnpm --filter @venus/engine cr:check`：pass
5. `pnpm --filter @venus/vector-editor-web exec tsc -p tsconfig.app.json --noEmit`：pass

## 29. Batch-6 执行记录（Capability Map 全面扩展）

批次状态：DONE
批次日期：2026-05-21
批次负责人：copilot

### 28.1 Scope

1. 将 runtime capability map 从 4 项扩展为覆盖已落地 runtime namespace（document/world/dirty/command/backend/plan/resource/observability）。
2. 保持 diagnostics capability snapshot 与 capability map 一致。

### 28.2 交付文件

1. Capability map：
   - `packages/engine/src/api/runtimeCapabilityMap.ts`
2. Contract test：
   - `packages/engine/src/testing/runtimeCapabilityMap.contract.test.ts`
3. Diagnostics 类型对齐：
   - `packages/engine/src/api/public-types.ts`

### 28.3 任务状态看板（Batch-6）

| ID    | Item                                                               | Owner   | Status | Evidence                                                          |
| ----- | ------------------------------------------------------------------ | ------- | ------ | ----------------------------------------------------------------- |
| B6-C1 | runtime capability map 扩展到 runtime 全命名空间                   | copilot | DONE   | packages/engine/src/api/runtimeCapabilityMap.ts                   |
| B6-C2 | capability map contract test 覆盖扩展 entry + executable path 解析 | copilot | DONE   | packages/engine/src/testing/runtimeCapabilityMap.contract.test.ts |
| B6-C3 | diagnostics capability 类型与 map 扩展对齐                         | copilot | DONE   | packages/engine/src/api/public-types.ts                           |
| B6-V1 | 四项校验命令全绿                                                   | copilot | DONE   | engine tsc/test/cr:check + vector tsc passed                      |

### 28.4 Validation

1. `pnpm --filter @venus/engine exec node --import tsx --test src/testing/runtimeCapabilityMap.contract.test.ts`：pass
2. `pnpm --filter @venus/engine exec tsc -p tsconfig.json --noEmit`：pass
3. `pnpm --filter @venus/engine test`：pass
4. `pnpm --filter @venus/engine cr:check`：pass
5. `pnpm --filter @venus/vector-editor-web exec tsc -p tsconfig.app.json --noEmit`：pass

## 30. Batch-5 CHANGE REQUEST（Plan + Resource + Observability）

[CHANGE REQUEST]

Target:

- File / Module:
  - `packages/engine/src/runtime/plan/runtime-plan.foundation.contract.ts`
  - `packages/engine/src/runtime/resource/runtime-resource.foundation.contract.ts`
  - `packages/engine/src/runtime/observability/runtime-observability.foundation.contract.ts`
  - `packages/engine/src/api/public-types.ts`
  - `packages/engine/src/api/createEngine.ts`
  - `packages/engine/src/testing/contract/runtime-plan.foundation.runtime.contract.test.ts`
  - `packages/engine/src/testing/contract/runtime-resource.foundation.runtime.contract.test.ts`
  - `packages/engine/src/testing/contract/runtime-observability.foundation.runtime.contract.test.ts`
  - `packages/engine/src/testing/createEngine.hard-cut.test.ts`
  - `packages/engine/docs/en/api/runtime-plan.md`
  - `packages/engine/docs/cn/api/runtime-plan.md`
  - `packages/engine/docs/en/api/runtime-resource.md`
  - `packages/engine/docs/cn/api/runtime-resource.md`
  - `packages/engine/docs/en/api/runtime-observability.md`
  - `packages/engine/docs/cn/api/runtime-observability.md`

Goal:

- Problem being solved:
  - 将 L0 foundation 的 `plan/resource/observability` 从“需求列表”推进到“可调用 contract + engine.runtime 接入 + 测试 + 双语文档”，并保持 engine runtime-only 职责边界。

Change Type:

- Add / Modify / Remove
  - Add: 3 个 foundation contract 文件、3 个 contract test 文件、6 个文档文件。
  - Modify: `public-types.ts`、`createEngine.ts`、`createEngine.hard-cut.test.ts`。
  - Remove: none。

Impact:

- Affected modules:
  - `engine.runtime.plan.*`
  - `engine.runtime.resource.*`
  - `engine.runtime.observability.*`
  - `EngineHandle.runtime` 类型契约与实现。

Cleanup:

- Old logic to remove:
  - 无旧逻辑替换；通过复用现有 diagnostics/stats/capture 机制，避免新增重复通路。

Tests:

- Tests to add/update:
  - 新增 plan/resource/observability foundation descriptor + determinism 合约测试。
  - 更新 hard-cut 集成测试，验证 runtime 新命名空间可调用与基本确定性。

### 26.1 Test Design（Batch-5）

1. Descriptor completeness：断言每个 foundation map 的 key 集完整且稳定。
2. Descriptor semantics：断言 level/stability/errorCodes/determinism 字段符合约束。
3. Resolver canonicality：断言 resolver 返回 map 同一引用条目。
4. Determinism：同输入重复调用 `plan/resource/observability` API 输出一致。
5. Runtime integration：通过 `createEngine` 实例验证三个 namespace 可调用且返回结构符合 contract。

## 31. Batch-5 执行记录（Plan + Resource + Observability）

批次状态：DONE
批次日期：2026-05-21
批次负责人：copilot

### 27.1 Scope

1. Task Card：F（plan）、G（resource）、H（observability）
2. API：
   - `engine.runtime.plan.createFramePlan(request)`
   - `engine.runtime.plan.createVisibilityPlan(request)`
   - `engine.runtime.plan.createLodPlan(request)`
   - `engine.runtime.plan.createRoiPlan(request)`
   - `engine.runtime.plan.createBudgetPlan(request)`
   - `engine.runtime.plan.inspect(plan)`
   - `engine.runtime.resource.register(descriptor)`
   - `engine.runtime.resource.update(resourceId, patch)`
   - `engine.runtime.resource.release(resourceId)`
   - `engine.runtime.resource.pin(resourceId)`
   - `engine.runtime.resource.unpin(resourceId)`
   - `engine.runtime.resource.getResidency(resourceId)`
   - `engine.runtime.resource.collectGarbage(options)`
   - `engine.runtime.observability.startTrace(options)`
   - `engine.runtime.observability.stopTrace(traceId)`
   - `engine.runtime.observability.getTrace(traceId)`
   - `engine.runtime.observability.getMetricsSnapshot()`
   - `engine.runtime.observability.captureFrame(options)`
   - `engine.runtime.observability.createReplayToken(scope)`
   - `engine.runtime.observability.replay(token)`

### 27.2 交付文件

1. Contract：
   - `packages/engine/src/runtime/plan/runtime-plan.foundation.contract.ts`
   - `packages/engine/src/runtime/resource/runtime-resource.foundation.contract.ts`
   - `packages/engine/src/runtime/observability/runtime-observability.foundation.contract.ts`
2. Runtime 接入：
   - `packages/engine/src/api/public-types.ts`
   - `packages/engine/src/api/createEngine.ts`
   - `packages/engine/src/index.ts`
3. Test：
   - `packages/engine/src/testing/contract/runtime-plan.foundation.runtime.contract.test.ts`
   - `packages/engine/src/testing/contract/runtime-resource.foundation.runtime.contract.test.ts`
   - `packages/engine/src/testing/contract/runtime-observability.foundation.runtime.contract.test.ts`
   - `packages/engine/src/testing/createEngine.hard-cut.test.ts`
4. Docs（en/cn）：
   - `packages/engine/docs/en/api/runtime-plan.md`
   - `packages/engine/docs/cn/api/runtime-plan.md`
   - `packages/engine/docs/en/api/runtime-resource.md`
   - `packages/engine/docs/cn/api/runtime-resource.md`
   - `packages/engine/docs/en/api/runtime-observability.md`
   - `packages/engine/docs/cn/api/runtime-observability.md`

### 27.3 任务状态看板（Batch-5）

| ID    | Item                                                            | Owner   | Status | Evidence                                                                               |
| ----- | --------------------------------------------------------------- | ------- | ------ | -------------------------------------------------------------------------------------- |
| B5-F1 | runtime-plan.foundation.contract.ts 建立并冻结字段              | copilot | DONE   | packages/engine/src/runtime/plan/runtime-plan.foundation.contract.ts                   |
| B5-G1 | runtime-resource.foundation.contract.ts 建立并冻结字段          | copilot | DONE   | packages/engine/src/runtime/resource/runtime-resource.foundation.contract.ts           |
| B5-H1 | runtime-observability.foundation.contract.ts 建立并冻结字段     | copilot | DONE   | packages/engine/src/runtime/observability/runtime-observability.foundation.contract.ts |
| B5-I1 | createEngine runtime plan/resource/observability 可调用实现接入 | copilot | DONE   | packages/engine/src/api/createEngine.ts                                                |
| B5-I2 | hard-cut 集成测试覆盖 runtime 新 namespace                      | copilot | DONE   | packages/engine/src/testing/createEngine.hard-cut.test.ts                              |
| B5-I3 | runtime-plan/resource/observability en/cn 文档同构              | copilot | DONE   | packages/engine/docs/en/api + packages/engine/docs/cn/api 对应新增页面                 |
| B5-V1 | 四项校验命令全绿                                                | copilot | DONE   | engine tsc/test/cr:check + vector tsc passed                                           |

### 27.4 Validation

1. `pnpm --filter @venus/engine exec tsc -p tsconfig.json --noEmit`：pass
2. `pnpm --filter @venus/engine test`：pass
3. `pnpm --filter @venus/engine cr:check`：pass
4. `pnpm --filter @venus/vector-editor-web exec tsc -p tsconfig.app.json --noEmit`：pass

## 44. Batch-22 初始化（事件与运行治理机制）

批次状态：DONE
批次日期：2026-05-21
批次负责人：copilot

### 44.1 Scope Definition（初始化冻结）

1. 本批仅覆盖第 9 节与第 10 节中“可抽象且无行业语义”的公共机制：
   - Event API（`engine.events.*` + 标准事件 payload contract）
   - Extension/Hooks/Scheduler/Cache/Policy/Security 的 contract-first 定义
2. 本批不做行业能力扩展，不新增 medical/bim/gis/cad/finance/video/game 等前缀。
3. 本批默认以 contract、test、docs 为主，runtime 可调用实现按“最小闭环”推进。

### 44.2 Boundary Definition（分界定）

1. 命名空间边界：
   - 允许：`engine.*`、`engine.runtime.*`、`engine.capability.*`
   - 本批新增 public 入口限定：`engine.events.*`、`engine.extension.*`、`engine.scheduler.*`、`engine.cache.*`、`engine.policy.*`、`engine.security.*`
   - 禁止新增其它 public namespace。
2. 分层边界：
   - L1 Developer API：`engine.events.*`、`engine.extension.*`、`engine.scheduler.*`、`engine.cache.*`、`engine.policy.*`、`engine.security.*`
   - L2 Runtime API：仅承接执行态细节，不承接产品语义
   - L3 Capability API：不直接承载事件总线治理语义，仍以能力包为主
3. 依赖边界：
   - `app -> engine/lib` 保持
   - `engine -> lib` 保持
   - 禁止新增逆向依赖与跨层私有 import。
4. 交付边界：
   - 每个新增 API 必须具备 contract + contract test + docs/en + docs/cn
   - 未满足四件套的 API 不得进入 runtime 实现。

### 44.3 Type Definition（本批最小冻结字段）

1. 事件通用 payload（适用于所有 `engine.*` 事件）：
   - `type`
   - `timestamp`
   - `engineId`
   - `revision`
2. 事件订阅控制输入：
   - `type | types`
   - `listener`
   - `options`（采样/节流/once/scope）
3. 调度任务输入：
   - `task`
   - `priority`
   - `budget`
   - `queue`
4. 缓存输入：
   - `namespace`
   - `key`
   - `policy`
5. 安全输入：
   - `trustLevel`
   - `resourceAccessPolicy`
   - `quota`

### 44.4 [CHANGE REQUEST] Batch-22

[CHANGE REQUEST]

Target:

- File / Module:
  - `packages/engine/src/runtime/events/runtime-events.contract.ts`
  - `packages/engine/src/runtime/extension/runtime-extension.contract.ts`
  - `packages/engine/src/runtime/scheduler/runtime-scheduler.contract.ts`
  - `packages/engine/src/runtime/cache/runtime-cache.contract.ts`
  - `packages/engine/src/runtime/policy/runtime-policy.contract.ts`
  - `packages/engine/src/runtime/security/runtime-security.contract.ts`
  - `packages/engine/src/api/public-types.ts`
  - `packages/engine/src/api/createEngine.ts`
  - `packages/engine/src/testing/contract/runtime-events.runtime.contract.test.ts`
  - `packages/engine/src/testing/contract/runtime-extension.runtime.contract.test.ts`
  - `packages/engine/src/testing/contract/runtime-scheduler.runtime.contract.test.ts`
  - `packages/engine/src/testing/contract/runtime-cache.runtime.contract.test.ts`
  - `packages/engine/src/testing/contract/runtime-policy.runtime.contract.test.ts`
  - `packages/engine/src/testing/contract/runtime-security.runtime.contract.test.ts`
  - `packages/engine/docs/en/api/event-api.md`
  - `packages/engine/docs/cn/api/event-api.md`
  - `packages/engine/docs/en/api/runtime-governance.md`
  - `packages/engine/docs/cn/api/runtime-governance.md`

Goal:

- Problem being solved:
  - 将第 9/10 节从“需求枚举”推进到“可执行 contract 基线”，并为后续 runtime 接入提供稳定阻断门禁。

Change Type:

- Add / Modify / Remove
  - Add：events/extension/scheduler/cache/policy/security contract + test + docs
  - Modify：`public-types.ts`、`createEngine.ts`（仅最小可调用接线）
  - Remove：none

Impact:

- Affected modules:
  - `engine.events.*`
  - `engine.extension.*`
  - `engine.scheduler.*`
  - `engine.cache.*`
  - `engine.policy.*`
  - `engine.security.*`

Cleanup:

- Old logic to remove:
  - 清理 runtime 内散落的非 contract 事件/治理入口，统一收敛到 contract 描述源。

Tests:

- Tests to add/update:
  - 事件 payload 必填字段断言（`type/timestamp/engineId/revision`）
  - 事件顺序 deterministic 断言（同输入、同 seed、同 backend）
  - scheduler 优先级 + 饥饿保护断言
  - cache 与 dirty domain 对齐断言
  - policy 变更可观测与可回放断言
  - security 输入 schema + quota 阻断断言

### 44.5 Test Design（Batch-22）

1. Descriptor completeness：6 个机制域 descriptor key 完整且稳定。
2. Descriptor semantics：level/stability/errorCodes/determinism 字段齐备。
3. Event determinism：同输入事件序列一致，listener 抛错隔离且 diagnostics 可见。
4. Governance determinism：scheduler/cache/policy/security 在固定输入下输出稳定。
5. Runtime integration：`createEngine` 上最小可调用入口存在且返回结构稳定。

### 44.6 阻断条件（Batch-22）

1. 任一机制域缺 contract：阻断。
2. 任一新增 public API 缺 en/cn 文档：阻断。
3. 事件 payload 缺少 4 个必填字段之一：阻断。
4. listener 异常可中断主流程：阻断。
5. scheduler 无预算字段或无饥饿保护断言：阻断。

### 44.7 Batch-22 任务状态看板（初始化）

| ID     | Item                                                    | Owner   | Status | Evidence                                                                                                                                                                                                                                                                                                                                                                                                        |
| ------ | ------------------------------------------------------- | ------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B22-E1 | events contract skeleton 冻结                           | copilot | DONE   | packages/engine/src/runtime/events/runtime-events.contract.ts                                                                                                                                                                                                                                                                                                                                                   |
| B22-E2 | events determinism + isolation 合约测试                 | copilot | DONE   | packages/engine/src/testing/contract/runtime-events.runtime.contract.test.ts                                                                                                                                                                                                                                                                                                                                    |
| B22-G1 | extension/scheduler/cache/policy/security contract 冻结 | copilot | DONE   | packages/engine/src/runtime/extension/runtime-extension.contract.ts + packages/engine/src/runtime/scheduler/runtime-scheduler.contract.ts + packages/engine/src/runtime/cache/runtime-cache.contract.ts + packages/engine/src/runtime/policy/runtime-policy.contract.ts + packages/engine/src/runtime/security/runtime-security.contract.ts                                                                     |
| B22-G2 | governance 合约测试（budget/cache/policy/security）     | copilot | DONE   | packages/engine/src/testing/contract/runtime-extension.runtime.contract.test.ts + packages/engine/src/testing/contract/runtime-scheduler.runtime.contract.test.ts + packages/engine/src/testing/contract/runtime-cache.runtime.contract.test.ts + packages/engine/src/testing/contract/runtime-policy.runtime.contract.test.ts + packages/engine/src/testing/contract/runtime-security.runtime.contract.test.ts |
| B22-D1 | events + governance 双语文档同构                        | copilot | DONE   | packages/engine/docs/en/api/event-api.md + packages/engine/docs/cn/api/event-api.md + packages/engine/docs/en/api/runtime-governance.md + packages/engine/docs/cn/api/runtime-governance.md                                                                                                                                                                                                                     |
| B22-K1 | EngineHandle governance namespace 接线 + hard-cut 回归  | copilot | DONE   | packages/engine/src/api/public-types.ts + packages/engine/src/api/createEngine.ts + packages/engine/src/testing/createEngine.hard-cut.test.ts                                                                                                                                                                                                                                                                   |
| B22-K2 | EngineHandle 事件语义强化（生命周期/文档/渲染/replay）  | copilot | DONE   | packages/engine/src/api/createEngine.ts + packages/engine/src/testing/createEngine.hard-cut.test.ts                                                                                                                                                                                                                                                                                                             |
| B22-V1 | engine/vector 四项校验命令全绿                          | copilot | DONE   | engine tsc + engine test + engine cr:check + vector tsc passed                                                                                                                                                                                                                                                                                                                                                  |
| B22-V2 | 全量回归收口（含 backend foundation 顺序断言修复）      | copilot | DONE   | packages/engine/src/testing/contract/backend.foundation.runtime.contract.test.ts + pnpm --filter @venus/engine exec node --import tsx --test src/testing/\*_/_.test.ts + pnpm --filter @venus/engine exec tsc -p tsconfig.json --noEmit + pnpm --filter @venus/engine cr:check                                                                                                                                  |

### 44.8 Validation 计划（Batch-22）

1. `pnpm --filter @venus/engine exec tsc -p tsconfig.json --noEmit`
2. `pnpm --filter @venus/engine test`
3. `pnpm --filter @venus/engine cr:check`
4. `pnpm --filter @venus/vector-editor-web exec tsc -p tsconfig.app.json --noEmit`

## 45. Batch-22 逐文件任务卡（可直接开工）

说明：本批严格遵循 `Scope Definition -> Type Definition -> CHANGE REQUEST -> Test Design -> Implementation -> Validation -> Cleanup Check`。

### 45.1 Task Card F：Event Contract（L1 订阅控制 + 包络约束）

1. Target Files：
   - `packages/engine/src/runtime/events/runtime-events.contract.ts`
   - `packages/engine/src/testing/contract/runtime-events.runtime.contract.test.ts`
   - `packages/engine/docs/en/api/event-api.md`
   - `packages/engine/docs/cn/api/event-api.md`
2. Scope API：
   - `engine.events.on(type, listener, options)`
   - `engine.events.off(type, listener)`
   - `engine.events.once(type, listener, options)`
   - `engine.events.onMany(types, listener, options)`
   - `engine.events.offAll(scope)`
   - `engine.events.pause(type)`
   - `engine.events.resume(type)`
   - `engine.events.getListenerStats()`
3. Contract 必填：
   - Event envelope：`type`、`timestamp`、`engineId`、`revision`
   - Ordering：同输入/同 seed/同 backend 顺序一致
   - Isolation：listener 抛错不可中断主流程
4. 测试门禁：
   - envelope 字段齐备断言
   - once/off/offAll 语义稳定断言
   - pause/resume 生效断言
   - listener throw 隔离断言

### 45.2 Task Card G：Extension Contract（插件边界）

1. Target Files：
   - `packages/engine/src/runtime/extension/runtime-extension.contract.ts`
   - `packages/engine/src/testing/contract/runtime-extension.runtime.contract.test.ts`
   - `packages/engine/docs/en/api/runtime-governance.md`
   - `packages/engine/docs/cn/api/runtime-governance.md`
2. Scope API：
   - `engine.extension.register(plugin)`
   - `engine.extension.unregister(pluginId)`
   - `engine.extension.list()`
   - `engine.extension.getState(pluginId)`
3. Contract 必填：
   - 插件可见面仅限 public API
   - 插件状态机（registered/active/errored/disposed）
4. 测试门禁：
   - 重复 register 冲突断言
   - unregister 幂等断言
   - 非法插件对象输入断言

### 45.3 Task Card H：Scheduler Contract（预算与饥饿保护）

1. Target Files：
   - `packages/engine/src/runtime/scheduler/runtime-scheduler.contract.ts`
   - `packages/engine/src/testing/contract/runtime-scheduler.runtime.contract.test.ts`
   - `packages/engine/docs/en/api/runtime-governance.md`
   - `packages/engine/docs/cn/api/runtime-governance.md`
2. Scope API：
   - `engine.scheduler.schedule(task, options)`
   - `engine.scheduler.cancel(taskId)`
   - `engine.scheduler.flush(queue)`
   - `engine.scheduler.getQueueStats()`
3. Contract 必填：
   - `priority`、`budgetMs`、`queue`
   - starvation guard（高优先级与低优先级公平窗口）
4. 测试门禁：
   - 优先级排序稳定断言
   - 超预算任务处理断言
   - 长时间低优先级饥饿保护断言

### 45.4 Task Card I：Cache Contract（与 dirty 对齐）

1. Target Files：
   - `packages/engine/src/runtime/cache/runtime-cache.contract.ts`
   - `packages/engine/src/testing/contract/runtime-cache.runtime.contract.test.ts`
   - `packages/engine/docs/en/api/runtime-governance.md`
   - `packages/engine/docs/cn/api/runtime-governance.md`
2. Scope API：
   - `engine.cache.get(namespace, key)`
   - `engine.cache.set(namespace, key, value, policy)`
   - `engine.cache.invalidate(namespace, key)`
   - `engine.cache.invalidateByTag(tag)`
   - `engine.cache.getStats(namespace)`
3. Contract 必填：
   - key/tag 命名约束
   - policy（ttl/lru/pin）
   - 与 dirty domain 对齐关系
4. 测试门禁：
   - 命中率统计稳定断言
   - invalidate 与 dirty flush 联动断言
   - 跨 namespace 隔离断言

### 45.5 Task Card J：Policy + Security Contract（可观测与审计）

1. Target Files：
   - `packages/engine/src/runtime/policy/runtime-policy.contract.ts`
   - `packages/engine/src/runtime/security/runtime-security.contract.ts`
   - `packages/engine/src/testing/contract/runtime-policy.runtime.contract.test.ts`
   - `packages/engine/src/testing/contract/runtime-security.runtime.contract.test.ts`
   - `packages/engine/docs/en/api/runtime-governance.md`
   - `packages/engine/docs/cn/api/runtime-governance.md`
2. Scope API：
   - `engine.policy.setRenderPolicy(policy)`
   - `engine.policy.setResourcePolicy(policy)`
   - `engine.policy.setFallbackPolicy(policy)`
   - `engine.policy.getEffectivePolicy()`
   - `engine.security.setTrustLevel(level)`
   - `engine.security.setResourceAccessPolicy(policy)`
   - `engine.security.getAuditLog(options)`
3. Contract 必填：
   - policy 变更事件可观测
   - replay token 下 policy/security 重放一致性
   - schema + quota 阻断语义
4. 测试门禁：
   - 非法 trust level 阻断断言
   - quota 超限阻断断言
   - policy 生效优先级合并断言

### 45.6 Task Card K：EngineHandle 接线（最小可调用）

1. Target Files：
   - `packages/engine/src/api/public-types.ts`
   - `packages/engine/src/api/createEngine.ts`
   - `packages/engine/src/testing/createEngine.hard-cut.test.ts`
2. Scope：
   - 为 `EngineHandle` 增补 `events/extension/scheduler/cache/policy/security` 命名空间
   - 保持现有 `on/off/once` 兼容，作为 `engine.events.*` 的简化桥接层
3. 测试门禁：
   - namespace 可调用断言
   - 旧 API（on/off/once）行为不回归断言

## 46. Batch-22 Kickoff Checklist（开工前）

### 46.1 输入物检查

- [x] Task Card F/G/H/I/J/K 范围冻结（不临时加项）
- [x] 错误码前缀统一为 `ENGINE_`
- [x] `docs/en` 与 `docs/cn` 目标页面存在且同构
- [x] contract test 文件命名与路径冻结

### 46.2 口径检查

- [x] 不新增行业语义命名空间
- [x] 不新增 `engine.*` / `engine.runtime.*` / `engine.capability.*` 之外 public namespace
- [x] 事件 envelope 4 字段为强制字段
- [x] listener throw 隔离为硬约束

### 46.3 校验基线

- [x] `pnpm --filter @venus/engine exec tsc -p tsconfig.json --noEmit`
- [x] `pnpm --filter @venus/engine test`
- [x] `pnpm --filter @venus/engine cr:check`
- [x] `pnpm --filter @venus/vector-editor-web exec tsc -p tsconfig.app.json --noEmit`

验证记录（2026-05-21）：

- `pnpm --filter @venus/engine exec tsc -p tsconfig.json --noEmit`：PASS
- `pnpm --filter @venus/engine test`：PASS（112 passed, 0 failed）
- `pnpm --filter @venus/engine cr:check`：PASS
- `pnpm --filter @venus/vector-editor-web exec tsc -p tsconfig.app.json --noEmit`：PASS
- `pnpm --filter @venus/engine exec node --import tsx --test src/testing/contract/backend.foundation.runtime.contract.test.ts`：PASS（4 passed, 0 failed）

## 47. Batch-23 执行记录（Hook 机制落地）

批次状态：DONE
批次日期：2026-05-21
批次负责人：copilot

### 47.1 Scope

1. 补齐第 10.2 节 Hook 机制到 contract-first 可执行基线。
2. 在 `EngineHandle` 暴露 `engine.hooks.*` 公共命名空间，覆盖 6 个阶段钩子：
   - `beforeCompile`
   - `afterCompile`
   - `beforeRenderPlan`
   - `afterRenderPlan`
   - `beforeSubmit`
   - `afterSubmit`
3. 增补 hooks 契约测试、hard-cut 行为测试与双语治理文档同步。

### 47.2 交付文件

1. Hook contract + contract test：
   - `packages/engine/src/runtime/hooks/runtime-hooks.contract.ts`
   - `packages/engine/src/testing/contract/runtime-hooks.runtime.contract.test.ts`
2. Public API 类型与实现接线：
   - `packages/engine/src/api/public-types.ts`
   - `packages/engine/src/api/createEngine.ts`
3. 集成测试与文档门禁：
   - `packages/engine/src/testing/createEngine.hard-cut.test.ts`
   - `packages/engine/src/testing/apiDocsCoverage.contract.test.ts`
4. 文档（en/cn）同步：
   - `packages/engine/docs/en/api/runtime-governance.md`
   - `packages/engine/docs/cn/api/runtime-governance.md`

### 47.3 API 变更审计台账（Batch-23）

| API                           | Contract Path                                               | Test Path                                                                   | Doc EN                                            | Doc CN                                            | Stability | Level     | Status |
| ----------------------------- | ----------------------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------- | ------------------------------------------------- | --------- | --------- | ------ |
| engine.hooks.beforeCompile    | packages/engine/src/runtime/hooks/runtime-hooks.contract.ts | packages/engine/src/testing/contract/runtime-hooks.runtime.contract.test.ts | packages/engine/docs/en/api/runtime-governance.md | packages/engine/docs/cn/api/runtime-governance.md | beta      | developer | DONE   |
| engine.hooks.afterCompile     | packages/engine/src/runtime/hooks/runtime-hooks.contract.ts | packages/engine/src/testing/contract/runtime-hooks.runtime.contract.test.ts | packages/engine/docs/en/api/runtime-governance.md | packages/engine/docs/cn/api/runtime-governance.md | beta      | developer | DONE   |
| engine.hooks.beforeRenderPlan | packages/engine/src/runtime/hooks/runtime-hooks.contract.ts | packages/engine/src/testing/contract/runtime-hooks.runtime.contract.test.ts | packages/engine/docs/en/api/runtime-governance.md | packages/engine/docs/cn/api/runtime-governance.md | beta      | developer | DONE   |
| engine.hooks.afterRenderPlan  | packages/engine/src/runtime/hooks/runtime-hooks.contract.ts | packages/engine/src/testing/contract/runtime-hooks.runtime.contract.test.ts | packages/engine/docs/en/api/runtime-governance.md | packages/engine/docs/cn/api/runtime-governance.md | beta      | developer | DONE   |
| engine.hooks.beforeSubmit     | packages/engine/src/runtime/hooks/runtime-hooks.contract.ts | packages/engine/src/testing/contract/runtime-hooks.runtime.contract.test.ts | packages/engine/docs/en/api/runtime-governance.md | packages/engine/docs/cn/api/runtime-governance.md | beta      | developer | DONE   |
| engine.hooks.afterSubmit      | packages/engine/src/runtime/hooks/runtime-hooks.contract.ts | packages/engine/src/testing/contract/runtime-hooks.runtime.contract.test.ts | packages/engine/docs/en/api/runtime-governance.md | packages/engine/docs/cn/api/runtime-governance.md | beta      | developer | DONE   |

### 47.4 Validation

1. `pnpm --filter @venus/engine exec node --import tsx --test src/testing/contract/runtime-hooks.runtime.contract.test.ts`：pass（3 passed, 0 failed）
2. `pnpm --filter @venus/engine exec node --import tsx --test src/testing/createEngine.hard-cut.test.ts`：pass（2 passed, 0 failed）
3. `pnpm --filter @venus/engine exec node --import tsx --test src/testing/apiDocsCoverage.contract.test.ts`：pass（1 passed, 0 failed）
4. `pnpm --filter @venus/engine exec tsc -p tsconfig.json --noEmit`：pass
5. `pnpm --filter @venus/engine exec node --import tsx --test src/testing/**/*.test.ts`：pass（137 passed, 0 failed）
6. `pnpm --filter @venus/engine cr:check`：pass
7. `pnpm --filter @venus/vector-editor-web exec tsc -p tsconfig.app.json --noEmit`：pass

## 48. Batch-24 执行记录（Lifecycle 事件域补齐）

批次状态：DONE
批次日期：2026-05-21
批次负责人：copilot

### 48.1 Scope

1. 补齐 Lifecycle 事件域在运行时行为中的 mount/unmount 前后阶段事件。
2. 保持现有 `engine.events.*` 订阅接口不扩面，仅补齐事件发射完整度。
3. 同步 contract、hard-cut 行为断言与 event-api 双语文档。

### 48.2 交付文件

1. Runtime 行为实现：
   - `packages/engine/src/api/createEngine.ts`
2. Event contract 类型补齐：
   - `packages/engine/src/runtime/events/runtime-events.contract.ts`
3. 集成测试与文档门禁：
   - `packages/engine/src/testing/createEngine.hard-cut.test.ts`
   - `packages/engine/src/testing/apiDocsCoverage.contract.test.ts`
4. 文档（en/cn）同步：
   - `packages/engine/docs/en/api/event-api.md`
   - `packages/engine/docs/cn/api/event-api.md`

### 48.3 API 变更审计台账（Batch-24）

| API                            | Contract Path                                                 | Test Path                                                 | Doc EN                                   | Doc CN                                   | Stability | Level     | Status |
| ------------------------------ | ------------------------------------------------------------- | --------------------------------------------------------- | ---------------------------------------- | ---------------------------------------- | --------- | --------- | ------ |
| engine.lifecycle.beforeMount   | packages/engine/src/runtime/events/runtime-events.contract.ts | packages/engine/src/testing/createEngine.hard-cut.test.ts | packages/engine/docs/en/api/event-api.md | packages/engine/docs/cn/api/event-api.md | beta      | developer | DONE   |
| engine.lifecycle.mounted       | packages/engine/src/runtime/events/runtime-events.contract.ts | packages/engine/src/testing/createEngine.hard-cut.test.ts | packages/engine/docs/en/api/event-api.md | packages/engine/docs/cn/api/event-api.md | beta      | developer | DONE   |
| engine.lifecycle.beforeUnmount | packages/engine/src/runtime/events/runtime-events.contract.ts | packages/engine/src/testing/createEngine.hard-cut.test.ts | packages/engine/docs/en/api/event-api.md | packages/engine/docs/cn/api/event-api.md | beta      | developer | DONE   |
| engine.lifecycle.unmounted     | packages/engine/src/runtime/events/runtime-events.contract.ts | packages/engine/src/testing/createEngine.hard-cut.test.ts | packages/engine/docs/en/api/event-api.md | packages/engine/docs/cn/api/event-api.md | beta      | developer | DONE   |

### 48.4 Validation

1. `pnpm --filter @venus/engine exec node --import tsx --test src/testing/createEngine.hard-cut.test.ts`：pass（2 passed, 0 failed）
2. `pnpm --filter @venus/engine exec node --import tsx --test src/testing/apiDocsCoverage.contract.test.ts`：pass（1 passed, 0 failed）
3. `pnpm --filter @venus/engine exec tsc -p tsconfig.json --noEmit`：pass
4. `pnpm --filter @venus/engine exec node --import tsx --test "src/testing/**/*.test.ts"`：pass（115 passed, 0 failed）
5. `pnpm --filter @venus/engine cr:check`：pass
6. `pnpm --filter @venus/vector-editor-web exec tsc -p tsconfig.app.json --noEmit`：pass

## 52. Batch-28 CHANGE REQUEST（事件隔离与诊断错误可观测性）

[CHANGE REQUEST]

Target:

- File / Module:
  - packages/engine/src/testing/createEngine.hard-cut.test.ts
  - packages/engine/src/testing/apiDocsCoverage.contract.test.ts
  - packages/engine/docs/en/api/event-api.md
  - packages/engine/docs/cn/api/event-api.md

Goal:

- Problem being solved:
  - 当前 hard-cut 已覆盖 diagnostics.warning/traceReady/captureReady，但对 listener throw 隔离后的 `engine.diagnostics.error` 可观测语义未形成显式行为断言。
  - docs coverage marker 未锁定 diagnostics.error 与 replay failed 路径，存在文档回退漏检窗口。

Change Type:

- Add / Modify / Remove
  - Modify（行为断言与文档 marker 补强）

Impact:

- Affected modules:
  - engine events hard-cut 行为回归门禁
  - event-api docs coverage marker 审计

Cleanup:

- Old logic to remove:
  - 无历史逻辑删除；以最小改动补齐断言与 marker。

Tests:

- Tests to add/update:
  - 更新 createEngine hard-cut：新增 diagnostics.error 行为断言（listener throw 隔离 + 主流程持续）
  - 更新 api docs coverage：新增 diagnostics.error 与 replay.failed marker 校验

## 53. Batch-28 执行记录（Listener 异常隔离诊断与文档门禁补强）

批次状态：DONE
批次日期：2026-05-22
批次负责人：copilot

### 53.1 Scope

1. 在 hard-cut 中补齐 `engine.diagnostics.error` 可观测行为断言，验证 listener throw 不中断主流程。
2. 在 docs coverage 合约测试中补齐 `engine.diagnostics.error` 与 `engine.replay.failed` marker 阻断。
3. 保持 `engine.events.*` 订阅 API 不扩面，最小化行为增强。

### 53.2 交付文件

1. 集成测试增强：
   - `packages/engine/src/testing/createEngine.hard-cut.test.ts`
2. 文档门禁增强：
   - `packages/engine/src/testing/apiDocsCoverage.contract.test.ts`

### 53.3 API 变更审计台账（Batch-28）

| API                      | Contract Path                                                 | Test Path                                                    | Doc EN                                   | Doc CN                                   | Stability | Level     | Status |
| ------------------------ | ------------------------------------------------------------- | ------------------------------------------------------------ | ---------------------------------------- | ---------------------------------------- | --------- | --------- | ------ |
| engine.diagnostics.error | packages/engine/src/runtime/events/runtime-events.contract.ts | packages/engine/src/testing/createEngine.hard-cut.test.ts    | packages/engine/docs/en/api/event-api.md | packages/engine/docs/cn/api/event-api.md | beta      | developer | DONE   |
| engine.replay.failed     | packages/engine/src/runtime/events/runtime-events.contract.ts | packages/engine/src/testing/apiDocsCoverage.contract.test.ts | packages/engine/docs/en/api/event-api.md | packages/engine/docs/cn/api/event-api.md | beta      | developer | DONE   |

### 53.4 Validation

1. `pnpm --filter @venus/engine exec node --import tsx --test src/testing/createEngine.hard-cut.test.ts`：pass（2 tests, 0 failures）
2. `pnpm --filter @venus/engine exec node --import tsx --test src/testing/apiDocsCoverage.contract.test.ts`：pass（1 test, 0 failures）
3. `pnpm --filter @venus/engine exec tsc -p tsconfig.json --noEmit`：pass
4. `pnpm --filter @venus/engine exec node --import tsx --test "src/testing/**/*.test.ts"`：pass（115 tests, 0 failures）
5. `pnpm --filter @venus/engine cr:check`：pass
6. `pnpm --filter @venus/vector-editor-web exec tsc -p tsconfig.app.json --noEmit`：pass

## 54. Batch-29 CHANGE REQUEST（Replay 失败路径事件可达性）

[CHANGE REQUEST]

Target:

- File / Module:
  - packages/engine/src/api/createEngine.ts
  - packages/engine/src/testing/createEngine.hard-cut.test.ts
  - packages/engine/src/testing/apiDocsCoverage.contract.test.ts

Goal:

- Problem being solved:
  - 现有 replay 失败事件主要依赖异常分支，常规 rejected token 路径缺少 `engine.replay.failed` 事件发射，导致失败路径可观测性不足。
  - hard-cut 对 replay started/completed/failed 三态覆盖不足，docs marker 对 started/completed 未形成阻断。

Change Type:

- Add / Modify / Remove
  - Modify（最小行为增强 + 断言与 marker 补齐）

Impact:

- Affected modules:
  - engine replay 事件语义（成功/失败）
  - hard-cut 行为回归门禁
  - api docs coverage marker 审计

Cleanup:

- Old logic to remove:
  - 无旧逻辑删除，仅将 rejected token 从 completed 语义分流到 failed 语义。

Tests:

- Tests to add/update:
  - hard-cut 增加 replay.started / replay.completed / replay.failed 监听与断言
  - docs coverage 增加 replay.started / replay.completed marker

## 55. Batch-29 执行记录（Replay 成败分流与门禁补强）

批次状态：DONE
批次日期：2026-05-22
批次负责人：copilot

### 55.1 Scope

1. 调整 replay 行为：accepted=true 发 `engine.replay.completed`；accepted=false 发 `engine.replay.failed`。
2. hard-cut 覆盖 replay 三态：started/completed/failed。
3. docs coverage marker 增补 replay.started/replay.completed，降低文档回退漏检窗口。

### 55.2 交付文件

1. Runtime 行为实现：
   - `packages/engine/src/api/createEngine.ts`
2. 集成测试增强：
   - `packages/engine/src/testing/createEngine.hard-cut.test.ts`
3. 文档门禁增强：
   - `packages/engine/src/testing/apiDocsCoverage.contract.test.ts`

### 55.3 API 变更审计台账（Batch-29）

| API                     | Contract Path                                                 | Test Path                                                 | Doc EN                                   | Doc CN                                   | Stability | Level     | Status |
| ----------------------- | ------------------------------------------------------------- | --------------------------------------------------------- | ---------------------------------------- | ---------------------------------------- | --------- | --------- | ------ |
| engine.replay.started   | packages/engine/src/runtime/events/runtime-events.contract.ts | packages/engine/src/testing/createEngine.hard-cut.test.ts | packages/engine/docs/en/api/event-api.md | packages/engine/docs/cn/api/event-api.md | beta      | developer | DONE   |
| engine.replay.completed | packages/engine/src/runtime/events/runtime-events.contract.ts | packages/engine/src/testing/createEngine.hard-cut.test.ts | packages/engine/docs/en/api/event-api.md | packages/engine/docs/cn/api/event-api.md | beta      | developer | DONE   |
| engine.replay.failed    | packages/engine/src/runtime/events/runtime-events.contract.ts | packages/engine/src/testing/createEngine.hard-cut.test.ts | packages/engine/docs/en/api/event-api.md | packages/engine/docs/cn/api/event-api.md | beta      | developer | DONE   |

### 55.4 Validation

1. `pnpm --filter @venus/engine exec node --import tsx --test src/testing/createEngine.hard-cut.test.ts`：pass（2 tests, 0 failures）
2. `pnpm --filter @venus/engine exec node --import tsx --test src/testing/apiDocsCoverage.contract.test.ts`：pass（1 test, 0 failures）
3. `pnpm --filter @venus/engine exec tsc -p tsconfig.json --noEmit`：pass
4. `pnpm --filter @venus/engine exec node --import tsx --test "src/testing/**/*.test.ts"`：pass（115 tests, 0 failures）
5. `pnpm --filter @venus/engine cr:check`：pass
6. `pnpm --filter @venus/vector-editor-web exec tsc -p tsconfig.app.json --noEmit`：pass

## 51. Batch-27 执行记录（Diagnostics/Replay 事件语义增强）

批次状态：DONE
批次日期：2026-05-22
批次负责人：copilot

### 51.1 Scope

1. 补齐 Diagnostics/Replay 事件域在运行时行为中的时机语义。
2. 保持现有 `engine.events.*` 订阅接口不扩面，仅增强事件发射时机与契约一致性。
3. 同步 event contract、hard-cut 行为断言与 event-api 双语文档、docs 门禁 marker。

### 51.2 交付文件

1. Runtime 行为实现：
   - `packages/engine/src/api/createEngine.ts`
2. Event contract 类型补齐：
   - `packages/engine/src/runtime/events/runtime-events.contract.ts`
3. 集成测试与文档门禁：
   - `packages/engine/src/testing/createEngine.hard-cut.test.ts`
   - `packages/engine/src/testing/apiDocsCoverage.contract.test.ts`
4. 文档（en/cn）同步：
   - `packages/engine/docs/en/api/event-api.md`
   - `packages/engine/docs/cn/api/event-api.md`

### 51.3 API 变更审计台账（Batch-27）

| API                             | Contract Path                                                 | Test Path                                                 | Doc EN                                   | Doc CN                                   | Stability | Level     | Status |
| ------------------------------- | ------------------------------------------------------------- | --------------------------------------------------------- | ---------------------------------------- | ---------------------------------------- | --------- | --------- | ------ |
| engine.diagnostics.warning      | packages/engine/src/runtime/events/runtime-events.contract.ts | packages/engine/src/testing/createEngine.hard-cut.test.ts | packages/engine/docs/en/api/event-api.md | packages/engine/docs/cn/api/event-api.md | beta      | developer | DONE   |
| engine.diagnostics.traceReady   | packages/engine/src/runtime/events/runtime-events.contract.ts | packages/engine/src/testing/createEngine.hard-cut.test.ts | packages/engine/docs/en/api/event-api.md | packages/engine/docs/cn/api/event-api.md | beta      | developer | DONE   |
| engine.diagnostics.captureReady | packages/engine/src/runtime/events/runtime-events.contract.ts | packages/engine/src/testing/createEngine.hard-cut.test.ts | packages/engine/docs/en/api/event-api.md | packages/engine/docs/cn/api/event-api.md | beta      | developer | DONE   |
| engine.replay.started           | packages/engine/src/runtime/events/runtime-events.contract.ts | packages/engine/src/testing/createEngine.hard-cut.test.ts | packages/engine/docs/en/api/event-api.md | packages/engine/docs/cn/api/event-api.md | beta      | developer | DONE   |
| engine.replay.completed         | packages/engine/src/runtime/events/runtime-events.contract.ts | packages/engine/src/testing/createEngine.hard-cut.test.ts | packages/engine/docs/en/api/event-api.md | packages/engine/docs/cn/api/event-api.md | beta      | developer | DONE   |
| engine.replay.failed            | packages/engine/src/runtime/events/runtime-events.contract.ts | packages/engine/src/testing/createEngine.hard-cut.test.ts | packages/engine/docs/en/api/event-api.md | packages/engine/docs/cn/api/event-api.md | beta      | developer | DONE   |

### 51.4 Validation

1. `pnpm --filter @venus/engine exec node --import tsx --test src/testing/createEngine.hard-cut.test.ts`：pass（2 passed, 0 failed）
2. `pnpm --filter @venus/engine exec node --import tsx --test src/testing/apiDocsCoverage.contract.test.ts`：pass（1 passed, 0 failed）
3. `pnpm --filter @venus/engine exec tsc -p tsconfig.json --noEmit`：pass
4. `pnpm --filter @venus/engine exec node --import tsx --test "src/testing/**/*.test.ts"`：pass（115 passed, 0 failed）
5. `pnpm --filter @venus/engine cr:check`：pass
6. `pnpm --filter @venus/vector-editor-web exec tsc -p tsconfig.app.json --noEmit`：pass

## 50. Batch-26 执行记录（Resource/Streaming 事件域补齐）

批次状态：DONE
批次日期：2026-05-22
批次负责人：copilot

### 50.1 Scope

1. 补齐 Resource/Streaming 事件域在运行时行为中的实际发射覆盖。
2. 保持现有 `engine.events.*` 订阅接口不扩面，仅补齐事件发射与契约一致性。
3. 同步 hard-cut 行为断言与 docs 门禁 marker。

### 50.2 交付文件

1. Runtime 行为实现：
   - `packages/engine/src/api/createEngine.ts`
2. 集成测试与文档门禁：
   - `packages/engine/src/testing/createEngine.hard-cut.test.ts`
   - `packages/engine/src/testing/apiDocsCoverage.contract.test.ts`

### 50.3 API 变更审计台账（Batch-26）

| API                           | Contract Path                                                 | Test Path                                                 | Doc EN                                   | Doc CN                                   | Stability | Level     | Status |
| ----------------------------- | ------------------------------------------------------------- | --------------------------------------------------------- | ---------------------------------------- | ---------------------------------------- | --------- | --------- | ------ |
| engine.resource.loadProgress  | packages/engine/src/runtime/events/runtime-events.contract.ts | packages/engine/src/testing/createEngine.hard-cut.test.ts | packages/engine/docs/en/api/event-api.md | packages/engine/docs/cn/api/event-api.md | beta      | developer | DONE   |
| engine.resource.loadFailed    | packages/engine/src/runtime/events/runtime-events.contract.ts | packages/engine/src/testing/createEngine.hard-cut.test.ts | packages/engine/docs/en/api/event-api.md | packages/engine/docs/cn/api/event-api.md | beta      | developer | DONE   |
| engine.streaming.backpressure | packages/engine/src/runtime/events/runtime-events.contract.ts | packages/engine/src/testing/createEngine.hard-cut.test.ts | packages/engine/docs/en/api/event-api.md | packages/engine/docs/cn/api/event-api.md | beta      | developer | DONE   |

### 50.4 Validation

1. `pnpm --filter @venus/engine exec node --import tsx --test src/testing/createEngine.hard-cut.test.ts`：pass（2 passed, 0 failed）
2. `pnpm --filter @venus/engine exec node --import tsx --test src/testing/apiDocsCoverage.contract.test.ts`：pass（1 passed, 0 failed）
3. `pnpm --filter @venus/engine exec tsc -p tsconfig.json --noEmit`：pass
4. `pnpm --filter @venus/engine exec node --import tsx --test "src/testing/**/*.test.ts"`：pass（115 passed, 0 failed）
5. `pnpm --filter @venus/engine cr:check`：pass
6. `pnpm --filter @venus/vector-editor-web exec tsc -p tsconfig.app.json --noEmit`：pass

## 49. Batch-25 执行记录（View/Interaction 事件域补齐）

批次状态：DONE
批次日期：2026-05-22
批次负责人：copilot

### 49.1 Scope

1. 补齐 View/Interaction 事件域在运行时行为中的实际发射覆盖。
2. 保持现有 `engine.events.*` 订阅接口不扩面，仅补齐事件发射与契约一致性。
3. 同步 event contract、hard-cut 行为断言与 event-api 双语文档、docs 门禁 marker。

### 49.2 交付文件

1. Runtime 行为实现：
   - `packages/engine/src/api/createEngine.ts`
2. Event contract 类型补齐：
   - `packages/engine/src/runtime/events/runtime-events.contract.ts`
3. 集成测试与文档门禁：
   - `packages/engine/src/testing/createEngine.hard-cut.test.ts`
   - `packages/engine/src/testing/apiDocsCoverage.contract.test.ts`
4. 文档（en/cn）同步：
   - `packages/engine/docs/en/api/event-api.md`
   - `packages/engine/docs/cn/api/event-api.md`

### 49.3 API 变更审计台账（Batch-25）

| API                              | Contract Path                                                 | Test Path                                                 | Doc EN                                   | Doc CN                                   | Stability | Level     | Status |
| -------------------------------- | ------------------------------------------------------------- | --------------------------------------------------------- | ---------------------------------------- | ---------------------------------------- | --------- | --------- | ------ |
| engine.view.changed              | packages/engine/src/runtime/events/runtime-events.contract.ts | packages/engine/src/testing/createEngine.hard-cut.test.ts | packages/engine/docs/en/api/event-api.md | packages/engine/docs/cn/api/event-api.md | beta      | developer | DONE   |
| engine.view.viewportResized      | packages/engine/src/runtime/events/runtime-events.contract.ts | packages/engine/src/testing/createEngine.hard-cut.test.ts | packages/engine/docs/en/api/event-api.md | packages/engine/docs/cn/api/event-api.md | beta      | developer | DONE   |
| engine.interaction.stateChanged  | packages/engine/src/runtime/events/runtime-events.contract.ts | packages/engine/src/testing/createEngine.hard-cut.test.ts | packages/engine/docs/en/api/event-api.md | packages/engine/docs/cn/api/event-api.md | beta      | developer | DONE   |
| engine.interaction.pickCompleted | packages/engine/src/runtime/events/runtime-events.contract.ts | packages/engine/src/testing/createEngine.hard-cut.test.ts | packages/engine/docs/en/api/event-api.md | packages/engine/docs/cn/api/event-api.md | beta      | developer | DONE   |
| engine.interaction.pickFailed    | packages/engine/src/runtime/events/runtime-events.contract.ts | packages/engine/src/testing/createEngine.hard-cut.test.ts | packages/engine/docs/en/api/event-api.md | packages/engine/docs/cn/api/event-api.md | beta      | developer | DONE   |

### 49.4 Validation

1. `pnpm --filter @venus/engine exec node --import tsx --test src/testing/createEngine.hard-cut.test.ts`：pass（2 passed, 0 failed）
2. `pnpm --filter @venus/engine exec node --import tsx --test src/testing/apiDocsCoverage.contract.test.ts`：pass（1 passed, 0 failed）
3. `pnpm --filter @venus/engine exec tsc -p tsconfig.json --noEmit`：pass
4. `pnpm --filter @venus/engine exec node --import tsx --test "src/testing/**/*.test.ts"`：pass（115 passed, 0 failed）
5. `pnpm --filter @venus/engine cr:check`：pass
6. `pnpm --filter @venus/vector-editor-web exec tsc -p tsconfig.app.json --noEmit`：pass
