# Runtime API Reference (`engine.runtime.*`)

Audience: advanced integrators, diagnostics pipelines, backend validation workflows.

## Scope

`engine.runtime.*` exposes direct execution and introspection APIs.
These APIs are synchronous and deterministic-oriented by contract.

Level: `advanced`
Stability: `beta`

## Direct L2 Endpoints

### Document / World

```ts
engine.runtime.getDocumentSnapshot(): EngineDocumentSnapshot
engine.runtime.getDocumentRevision(): number
engine.runtime.applyChangeSet(input: EngineRuntimeDocumentApplyChangeSetInput): EngineRuntimeDocumentApplyChangeSetResult
engine.runtime.compileWorld(options?: { snapshot?: EngineDocumentSnapshot }): EngineRuntimeWorldSnapshotOutput
engine.runtime.getRuntimeWorld(): EngineRuntimeWorldSnapshotOutput
engine.runtime.getRuntimeWorldStats(): EngineRuntimeWorldGraphStatsOutput
```

### Dirty / Compile Trigger

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

### GPU Explicit Path

```ts
engine.runtime.createGpuResource(descriptor: EngineRuntimeGpuResourceDescriptor): EngineRuntimeGpuResourceOutput
engine.runtime.updateGpuResource(resourceId: string, patch: Readonly<Record<string, unknown>>): EngineRuntimeGpuResourceOutput
engine.runtime.destroyGpuResource(resourceId: string): EngineRuntimeGpuResourceOutput
engine.runtime.createUploadBatch(request: { resourceIds: readonly string[] }): EngineRuntimeUploadBatchOutput
engine.runtime.createBarrierPlan(request: { resourceIds: readonly string[] }): EngineRuntimeBarrierPlanOutput
engine.runtime.applyBarrierPlan(plan: { planId: string }): EngineRuntimeBarrierApplyOutput
engine.runtime.readbackResource(request: { resourceId: string }): EngineRuntimeReadbackOutput
```

### Spatial / Hit-Test

```ts
engine.runtime.queryViewportCandidates(query: EngineQueryBoundsInput): EngineRuntimeSpatialQueryOutput
engine.runtime.queryFrustumVisibleSet(query: Readonly<Record<string, unknown>>): EngineRuntimeSpatialQueryOutput
engine.runtime.hitTestPlanar(point: EnginePickPointInput, options?: EnginePickOptions): EnginePickResult
engine.runtime.hitTestRay(ray: EngineRayInput, options?: EngineRaycastOptions): EngineRaycastHit | null
engine.runtime.querySpatialIndex(query: Readonly<Record<string, unknown>>): EngineRuntimeSpatialQueryOutput
```

### Backend Runtime State

```ts
engine.runtime.getBackendState(): EngineRuntimeBackendStateOutput
engine.runtime.switchBackend(target: EngineBackendMode | "auto", options?: Readonly<Record<string, unknown>>): EngineRuntimeBackendStateOutput
engine.runtime.getBackendFallbackHistory(): EngineRuntimeBackendFallbackHistoryOutput
engine.runtime.setBackendDebugOptions(options: Readonly<Record<string, unknown>>): { accepted: boolean }
```

### Observability / Replay

```ts
engine.runtime.captureFrame(options?: EngineRuntimeCaptureFrameInput): EngineRuntimeCaptureFrameOutput
engine.runtime.captureCommandTrace(options?: { label?: string }): EngineRuntimeCommandTraceOutput
engine.runtime.createReplayToken(scope: string): EngineRuntimeReplayTokenOutput
engine.runtime.replay(token: string): EngineRuntimeReplayOutput
engine.runtime.getMetrics(): EnginePublicMetricsOutput
engine.runtime.getTrace(traceId: string): EngineRuntimeGetTraceOutput
```

## Foundation Namespaces

In addition to direct L2 endpoints, runtime foundation namespaces remain available:

1. `engine.runtime.document.*`
2. `engine.runtime.world.*`
3. `engine.runtime.dirty.*`
4. `engine.runtime.command.*`
5. `engine.runtime.backend.*`
6. `engine.runtime.plan.*`
7. `engine.runtime.resource.*`
8. `engine.runtime.observability.*`

## Safety Notes

1. Runtime APIs may bypass high-level guardrails; validate all external input first.
2. Prefer idempotent and deterministic calls for diagnostics and replay workflows.
3. Use Developer API (`engine.*`) for normal product flows unless low-level control is required.
