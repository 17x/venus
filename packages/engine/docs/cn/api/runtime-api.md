# Runtime API 参考（`engine.runtime.*`）

受众：高级集成方、诊断工具链、后端一致性验证流程。

## 范围说明

`engine.runtime.*` 暴露直连执行与内省接口。
这些接口按 contract 为同步调用，并强调确定性行为。

级别：`advanced`
稳定性：`beta`

## L2 直连接口

### Document / World

```ts
engine.runtime.getDocumentSnapshot(): EngineDocumentSnapshot
engine.runtime.getDocumentRevision(): number
engine.runtime.applyChangeSet(input: EngineRuntimeDocumentApplyChangeSetInput): EngineRuntimeDocumentApplyChangeSetResult
engine.runtime.document.preflightApplyChangeSet(input: EngineRuntimeDocumentPreflightApplyChangeSetInput): EngineRuntimeDocumentPreflightApplyChangeSetOutput
engine.runtime.compileWorld(options?: { snapshot?: EngineDocumentSnapshot }): EngineRuntimeWorldSnapshotOutput
engine.runtime.getRuntimeWorld(): EngineRuntimeWorldSnapshotOutput
engine.runtime.getRuntimeWorldStats(): EngineRuntimeWorldGraphStatsOutput
```

### Dirty / 增量编译触发

```ts
engine.runtime.getDirtyState(): EngineRuntimeDirtyStateOutput
engine.runtime.markDirty(domain: EngineRuntimeDirtyMarkInput["domain"], token: string): EngineRuntimeDirtyStateOutput
engine.runtime.flushDirtyState(domains: readonly EngineRuntimeDirtyMarkInput["domain"][]): EngineRuntimeDirtyFlushOutput
engine.runtime.scheduleIncrementalCompile(options?: { reason?: string }): EngineRuntimeCompileTriggerOutput
engine.runtime.forceFullCompile(reason: string): EngineRuntimeCompileTriggerOutput
```

### Plan / Command / Submit

```ts
engine.runtime.createRenderPlan(request: EngineRuntimePlanFrameRequest): EngineRuntimeFramePlanOutput
engine.runtime.inspectRenderPlan(plan: unknown): EngineRuntimePlanInspectOutput
engine.runtime.encodeCommandBuffer(plan: EngineRuntimeCommandEncodeInput): EngineRuntimeCommandEncodeOutput
engine.runtime.validateCommandBuffer(buffer: EngineRuntimeCommandValidateInput): EngineRuntimeCommandValidateOutput
engine.runtime.submit(commandBuffer: EngineRuntimeCommandValidateInput): EngineRuntimeSubmitOutput
engine.runtime.submitBatch(commandBuffers: readonly EngineRuntimeCommandValidateInput[]): EngineRuntimeSubmitOutput
```

### GPU 显式链路

```ts
engine.runtime.createGpuResource(descriptor: EngineRuntimeGpuResourceDescriptor): EngineRuntimeGpuResourceOutput
engine.runtime.updateGpuResource(resourceId: string, patch: Readonly<Record<string, unknown>>): EngineRuntimeGpuResourceOutput
engine.runtime.destroyGpuResource(resourceId: string): EngineRuntimeGpuResourceOutput
engine.runtime.createUploadBatch(request: { resourceIds: readonly string[] }): EngineRuntimeUploadBatchOutput
engine.runtime.createBarrierPlan(request: { resourceIds: readonly string[] }): EngineRuntimeBarrierPlanOutput
engine.runtime.applyBarrierPlan(plan: { planId: string }): EngineRuntimeBarrierApplyOutput
engine.runtime.readbackResource(request: { resourceId: string }): EngineRuntimeReadbackOutput
```

### Spatial / 命中测试

```ts
engine.runtime.queryViewportCandidates(query: EngineQueryBoundsInput): EngineRuntimeSpatialQueryOutput
engine.runtime.queryFrustumVisibleSet(query: Readonly<Record<string, unknown>>): EngineRuntimeSpatialQueryOutput
engine.runtime.hitTestPlanar(point: EnginePickPointInput, options?: EnginePickOptions): EnginePickResult
engine.runtime.hitTestRay(ray: EngineRayInput, options?: EngineRaycastOptions): EngineRaycastHit | null
engine.runtime.querySpatialIndex(query: Readonly<Record<string, unknown>>): EngineRuntimeSpatialQueryOutput
```

### 后端运行态

```ts
engine.runtime.getBackendState(): EngineRuntimeBackendStateOutput
engine.runtime.switchBackend(target: EngineBackendMode | "auto", options?: Readonly<Record<string, unknown>>): EngineRuntimeBackendStateOutput
engine.runtime.getBackendFallbackHistory(): EngineRuntimeBackendFallbackHistoryOutput
engine.runtime.setBackendDebugOptions(options: Readonly<Record<string, unknown>>): { accepted: boolean }
```

### 观测 / 回放

```ts
engine.runtime.captureFrame(options?: EngineRuntimeCaptureFrameInput): EngineRuntimeCaptureFrameOutput
engine.runtime.captureCommandTrace(options?: { label?: string }): EngineRuntimeCommandTraceOutput
engine.runtime.createReplayToken(scope: string): EngineRuntimeReplayTokenOutput
engine.runtime.replay(token: string): EngineRuntimeReplayOutput
engine.runtime.getMetrics(): EnginePublicMetricsOutput
engine.runtime.getTrace(traceId: string): EngineRuntimeGetTraceOutput
```

## Foundation 命名空间

除 L2 直连接口外，runtime foundation 命名空间继续可用：

1. `engine.runtime.document.*`
2. `engine.runtime.world.*`
3. `engine.runtime.dirty.*`
4. `engine.runtime.command.*`
5. `engine.runtime.backend.*`
6. `engine.runtime.plan.*`
7. `engine.runtime.resource.*`
8. `engine.runtime.observability.*`

## Runtime 安全说明

1. Runtime API 可能绕过高层保护，外部输入必须先校验。
2. 诊断与回放链路应优先使用幂等且确定性的调用方式。
3. 常规产品流程优先使用 Developer API（`engine.*`），仅在需要低层控制时使用 runtime API。
