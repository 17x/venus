# @venus/engine — UNIVERSAL RUNTIME ENGINE ARCHITECTURE

## ENGINE POSITIONING

`@venus/engine` is not a game-only renderer.

It is a:

- universal realtime runtime
- heterogeneous rendering engine
- simulation runtime
- compositing runtime
- streaming visualization platform
- editor/runtime convergence architecture

The engine must support:

1. Medical imaging (CT/MRI)
2. Surgical simulation
3. BIM collaboration
4. Industrial CAD
5. GIS visualization
6. Digital twin systems
7. Autonomous driving replay
8. Scientific visualization
9. Molecular rendering
10. 2D vector editing
11. Video editing
12. Game runtime/editor convergence
13. Whiteboard collaboration
14. Massive SVG/PDF rendering
15. Financial visualization
16. XR / AR / VR
17. Robotics visualization
18. IoT dashboards
19. Cloud streaming frontend
20. Remote rendering frontend
21. AI-generated scene visualization
22. Massive timeline/log visualization
23. Presentation rendering
24. Live compositing
25. Browser creative coding runtime
26. Procedural node graph editor
27. Simulation replay systems
28. Forensic playback systems
29. Scientific volume rendering
30. Large-scale geospatial visualization

---

# CORE ARCHITECTURE GOALS

The engine must evolve toward:

```txt
Document Runtime
+
Realtime Scheduler
+
GPU Driven Renderer
+
Streaming Runtime
+
Unified Composition System
+
Incremental Runtime Evaluation
```

The engine must NOT evolve toward:

```txt
single scene renderer
```

---

# MONOREPO STRUCTURE

```txt
packages/
 ├── engine/                         # @venus/engine
 │    ├── src/
 │    │
 │    │    ├── core/
 │    │    │    ├── Engine.ts
 │    │    │    ├── Runtime.ts
 │    │    │    ├── Bootstrap.ts
 │    │    │    ├── EngineConfig.ts
 │    │    │    ├── EngineContext.ts
 │    │    │    ├── RuntimeState.ts
 │    │    │    ├── RuntimePressure.ts
 │    │    │    ├── RuntimeBudget.ts
 │    │    │    ├── RuntimePolicy.ts
 │    │    │    ├── FrameLoop.ts
 │    │    │    ├── TickLoop.ts
 │    │    │    ├── FixedUpdate.ts
 │    │    │    ├── VariableUpdate.ts
 │    │    │    └── DeviceCapability.ts
 │    │
 │    │    ├── backend/
 │    │    │    ├── Backend.ts
 │    │    │    ├── BackendSelector.ts
 │    │    │    ├── BackendCapabilities.ts
 │    │    │    ├── BackendContext.ts
 │    │    │    ├── webgpu/
 │    │    │    │    ├── WebGPUBackend.ts
 │    │    │    │    ├── WebGPUDevice.ts
 │    │    │    │    ├── WebGPUContext.ts
 │    │    │    │    ├── WebGPUPipeline.ts
 │    │    │    │    └── WebGPUShaderCompiler.ts
 │    │    │    └── webgl/
 │    │    │         ├── WebGLBackend.ts
 │    │    │         ├── WebGLContext.ts
 │    │    │         ├── WebGLPipeline.ts
 │    │    │         └── WebGLShaderCompiler.ts
 │    │
 │    │    ├── ecs/
 │    │    │    ├── ECSWorld.ts
 │    │    │    ├── Entity.ts
 │    │    │    ├── Component.ts
 │    │    │    ├── ComponentStore.ts
 │    │    │    ├── System.ts
 │    │    │    ├── Query.ts
 │    │    │    ├── Archetype.ts
 │    │    │    ├── EntityAllocator.ts
 │    │    │    ├── ChunkAllocator.ts
 │    │    │    └── SparseSet.ts
 │    │
 │    │    ├── scene/
 │    │    │    ├── Scene.ts
 │    │    │    ├── SceneGraph.ts
 │    │    │    ├── SceneNode.ts
 │    │    │    ├── SubScene.ts
 │    │    │    ├── Prefab.ts
 │    │    │    ├── WorldPartition.ts
 │    │    │    ├── Chunk.ts
 │    │    │    ├── Region.ts
 │    │    │    ├── Sector.ts
 │    │    │    └── SceneSerializer.ts
 │    │
 │    │    ├── runtime/
 │    │    │    ├── Scheduler.ts
 │    │    │    ├── Task.ts
 │    │    │    ├── TaskGraph.ts
 │    │    │    ├── WorkGraph.ts
 │    │    │    ├── ExecutionGraph.ts
 │    │    │    ├── DependencyGraph.ts
 │    │    │    ├── JobSystem.ts
 │    │    │    ├── WorkerPool.ts
 │    │    │    ├── FiberScheduler.ts
 │    │    │    ├── Invalidation.ts
 │    │    │    ├── DirtyFlag.ts
 │    │    │    ├── Versioning.ts
 │    │    │    ├── StatePropagation.ts
 │    │    │    ├── FrameBudget.ts
 │    │    │    └── RuntimeDiagnostics.ts
 │    │
 │    │    ├── math/
 │    │    │    ├── Matrix4.ts
 │    │    │    ├── Matrix3.ts
 │    │    │    ├── Quaternion.ts
 │    │    │    ├── Euler.ts
 │    │    │    ├── Vector2.ts
 │    │    │    ├── Vector3.ts
 │    │    │    ├── Vector4.ts
 │    │    │    ├── Frustum.ts
 │    │    │    ├── Plane.ts
 │    │    │    ├── Ray.ts
 │    │    │    ├── AABB.ts
 │    │    │    ├── OBB.ts
 │    │    │    ├── BoundingSphere.ts
 │    │    │    ├── Transform.ts
 │    │    │    ├── Projection.ts
 │    │    │    └── Intersection.ts
 │    │
 │    │    ├── renderer/
 │    │    │    ├── Renderer.ts
 │    │    │    ├── Renderer2D.ts
 │    │    │    ├── Renderer3D.ts
 │    │    │    ├── VolumeRenderer.ts
 │    │    │    ├── VideoRenderer.ts
 │    │    │    ├── CompositionRenderer.ts
 │    │    │    ├── RenderQueue.ts
 │    │    │    ├── RenderLayer.ts
 │    │    │    ├── RenderItem.ts
 │    │    │    ├── RenderPass.ts
 │    │    │    ├── RenderPipeline.ts
 │    │    │    ├── RenderTarget.ts
 │    │    │    ├── Framebuffer.ts
 │    │    │    ├── Material.ts
 │    │    │    ├── Shader.ts
 │    │    │    ├── ShaderVariant.ts
 │    │    │    ├── Texture.ts
 │    │    │    ├── TextureAtlas.ts
 │    │    │    ├── Geometry.ts
 │    │    │    ├── Mesh.ts
 │    │    │    ├── SkinnedMesh.ts
 │    │    │    └── GPUDrivenRenderer.ts
 │    │
 │    │    ├── render-graph/
 │    │    │    ├── RenderGraph.ts
 │    │    │    ├── FrameGraph.ts
 │    │    │    ├── RenderGraphCompiler.ts
 │    │    │    ├── RenderPassNode.ts
 │    │    │    ├── ResourceNode.ts
 │    │    │    ├── PassBuilder.ts
 │    │    │    └── TransientResourcePool.ts
 │    │
 │    │    ├── visibility/
 │    │    │    ├── VisibilitySystem.ts
 │    │    │    ├── VisibleSet.ts
 │    │    │    ├── FrustumCulling.ts
 │    │    │    ├── OcclusionCulling.ts
 │    │    │    ├── HZBCulling.ts
 │    │    │    ├── ClusterCulling.ts
 │    │    │    ├── DistanceCulling.ts
 │    │    │    ├── LODSystem.ts
 │    │    │    ├── BillboardSystem.ts
 │    │    │    └── VisibilityBuffer.ts
 │    │
 │    │    ├── spatial/
 │    │    │    ├── BVH.ts
 │    │    │    ├── Octree.ts
 │    │    │    ├── Quadtree.ts
 │    │    │    ├── KDTree.ts
 │    │    │    ├── SpatialHash.ts
 │    │    │    ├── UniformGrid.ts
 │    │    │    ├── Raycast.ts
 │    │    │    ├── Collision.ts
 │    │    │    ├── BroadPhase.ts
 │    │    │    └── NarrowPhase.ts
 │    │    ├── picking/
 │    │    │    ├── HitTestSystem.ts
 │    │    │    ├── HitTestContext.ts
 │    │    │    ├── HitTestResult.ts
 │    │    │    ├── PickingPipeline.ts
 │    │    │    ├── PickingBuffer.ts
 │    │    │    ├── GPUColorPicking.ts
 │    │    │    ├── CPUPicking.ts
 │    │    │    ├── RayPicking.ts
 │    │    │    ├── MarqueePicking.ts
 │    │    │    ├── LassoPicking.ts
 │    │    │    ├── HoverPicking.ts
 │    │    │    ├── SelectionPicking.ts
 │    │    │    ├── BroadPhase.ts
 │    │    │    ├── NarrowPhase.ts
 │    │    │    ├── SpatialPicking.ts
 │    │    │    ├── PickingAcceleration.ts
 │    │    │    ├── BVHPicking.ts
 │    │    │    ├── QuadtreePicking.ts
 │    │    │    ├── SpatialHashPicking.ts
 │    │    │    ├── PathFlattening.ts
 │    │    │    ├── CurveSubdivision.ts
 │    │    │    ├── StrokeHitTest.ts
 │    │    │    ├── FillHitTest.ts
 │    │    │    ├── BezierHitTest.ts
 │    │    │    ├── TextHitTest.ts
 │    │    │    ├── TilePicking.ts
 │    │    │    ├── VisibilityPicking.ts
 │    │    │    ├── PenetrationPicking.ts
 │    │    │    ├── HitProxy.ts
 │    │    │    ├── HitPriority.ts
 │    │    │    ├── PickingCache.ts
 │    │    │    └── IncrementalPicking.ts
 │    │
 │    │    ├── gpu/
 │    │    │    ├── GPUDevice.ts
 │    │    │    ├── GPUBuffer.ts
 │    │    │    ├── GPUTexture.ts
 │    │    │    ├── GPUHeap.ts
 │    │    │    ├── GPUArena.ts
 │    │    │    ├── GPUResource.ts
 │    │    │    ├── ResourceTracker.ts
 │    │    │    ├── UploadQueue.ts
 │    │    │    ├── UploadBuffer.ts
 │    │    │    ├── StagingBuffer.ts
 │    │    │    ├── RingBuffer.ts
 │    │    │    ├── DescriptorPool.ts
 │    │    │    ├── BindGroupAllocator.ts
 │    │    │    ├── PipelineCache.ts
 │    │    │    ├── ShaderCache.ts
 │    │    │    ├── GPUProfiler.ts
 │    │    │    └── TimestampQuery.ts
 │    │
 │    │    ├── animation/
 │    │    │    ├── Skeleton.ts
 │    │    │    ├── Bone.ts
 │    │    │    ├── Joint.ts
 │    │    │    ├── Skinning.ts
 │    │    │    ├── AnimationClip.ts
 │    │    │    ├── AnimationGraph.ts
 │    │    │    ├── AnimationStateMachine.ts
 │    │    │    ├── BlendTree.ts
 │    │    │    ├── IK.ts
 │    │    │    ├── FK.ts
 │    │    │    └── MorphTarget.ts
 │    │
 │    │    ├── physics/
 │    │    │    ├── PhysicsWorld.ts
 │    │    │    ├── RigidBody.ts
 │    │    │    ├── SoftBody.ts
 │    │    │    ├── Collider.ts
 │    │    │    ├── CollisionShape.ts
 │    │    │    ├── Constraint.ts
 │    │    │    ├── PhysicsStep.ts
 │    │    │    ├── ForceSolver.ts
 │    │    │    └── CCD.ts
 │    │
 │    │    ├── streaming/
 │    │    │    ├── StreamingSystem.ts
 │    │    │    ├── ChunkStreaming.ts
 │    │    │    ├── AssetStreaming.ts
 │    │    │    ├── BackgroundLoading.ts
 │    │    │    ├── ResidencyManager.ts
 │    │    │    ├── TextureStreaming.ts
 │    │    │    ├── GeometryStreaming.ts
 │    │    │    ├── VirtualTexturing.ts
 │    │    │    └── SparseResidency.ts
 │    │
 │    │    ├── video/
 │    │    │    ├── Timeline.ts
 │    │    │    ├── Track.ts
 │    │    │    ├── Clip.ts
 │    │    │    ├── Keyframe.ts
 │    │    │    ├── Curve.ts
 │    │    │    ├── VideoDecoder.ts
 │    │    │    ├── AudioSync.ts
 │    │    │    ├── CompositionGraph.ts
 │    │    │    └── PlaybackScheduler.ts
 │    │
 │    │    ├── volume/
 │    │    │    ├── Volume.ts
 │    │    │    ├── Voxel.ts
 │    │    │    ├── DICOMLoader.ts
 │    │    │    ├── SliceRenderer.ts
 │    │    │    ├── TransferFunction.ts
 │    │    │    ├── MarchingCubes.ts
 │    │    │    ├── MPRRenderer.ts
 │    │    │    └── VolumeRaycaster.ts
 │    │
 │    │    ├── gis/
 │    │    │    ├── GISRuntime.ts
 │    │    │    ├── Tile.ts
 │    │    │    ├── TileStreaming.ts
 │    │    │    ├── Projection.ts
 │    │    │    ├── WGS84.ts
 │    │    │    ├── ECEF.ts
 │    │    │    ├── Mercator.ts
 │    │    │    ├── TerrainLOD.ts
 │    │    │    ├── FloatingOrigin.ts
 │    │    │    └── GeoClipmap.ts
 │    │
 │    │    ├── editor/
 │    │    │    ├── SelectionSystem.ts
 │    │    │    ├── HoverSystem.ts
 │    │    │    ├── Picking.ts
 │    │    │    ├── PickingBuffer.ts
 │    │    │    ├── Gizmo.ts
 │    │    │    ├── TransformGizmo.ts
 │    │    │    ├── Manipulator.ts
 │    │    │    ├── SnappingSystem.ts
 │    │    │    ├── GuideSystem.ts
 │    │    │    ├── OverlayRenderer.ts
 │    │    │    ├── ToolSystem.ts
 │    │    │    └── InfiniteCanvas.ts
 │    │
 │    │    ├── diagnostics/
 │    │    │    ├── Profiler.ts
 │    │    │    ├── CPUProfiler.ts
 │    │    │    ├── GPUProfiler.ts
 │    │    │    ├── FrameAnalyzer.ts
 │    │    │    ├── RuntimeInspector.ts
 │    │    │    ├── MemoryTracker.ts
 │    │    │    ├── UploadTracker.ts
 │    │    │    ├── OverdrawVisualization.ts
 │    │    │    ├── ShaderComplexity.ts
 │    │    │    ├── WireframeView.ts
 │    │    │    ├── DebugDraw.ts
 │    │    │    └── RenderDocBridge.ts
 │    │
 │    │    ├── testing/
 │    │    │    ├── SnapshotTesting.ts
 │    │    │    ├── VisualRegression.ts
 │    │    │    ├── PerformanceRegression.ts
 │    │    │    ├── MemoryRegression.ts
 │    │    │    ├── ReplayTesting.ts
 │    │    │    └── DeterministicReplay.ts
 │    │
 │    │    └── api/
 │    │         ├── createEngine.ts
 │    │         ├── createScene.ts
 │    │         ├── createRenderer.ts
 │    │         ├── public-types.ts
 │    │         └── index.ts
 │    │
 │    ├── package.json
 │    ├── tsconfig.json
 │    └── README.md
```

---

# BACKEND ARCHITECTURE

Backend selection should default to:

```ts
backend: "auto";
```

Runtime behavior:

```txt
WebGPU available
 → use WebGPU backend

otherwise
 → fallback to WebGL2 backend
```

The engine must preserve:

```txt
single high-level runtime API
```

Applications must NOT care about:

- WebGPU
- WebGL2
- shader backend
- pipeline backend
- upload implementation

unless explicitly requested.

---

# TOP LEVEL API

```ts
const engine = await VenusEngine.create({
  canvas,
  backend: "auto",
  powerPreference: "high-performance",
  antialias: true,
  debug: false,
});
```

---

# ENGINE API

```ts
engine.start();
engine.stop();
engine.pause();
engine.resume();
engine.dispose();
engine.resize(width, height);
engine.captureFrame();
engine.captureSnapshot();
engine.setPixelRatio();
engine.getStats();
engine.getCapabilities();
engine.getBackendInfo();
```

---

# SCENE API

```ts
const scene = engine.createScene();

scene.add(entity);
scene.remove(entity);
scene.clear();
scene.traverse();
scene.query();
scene.raycast();
scene.serialize();
scene.deserialize();
scene.load();
scene.unload();
```

---

# ENTITY API

```ts
const entity = scene.createEntity();

entity.addComponent();
entity.removeComponent();
entity.getComponent();
entity.hasComponent();
entity.setParent();
entity.removeParent();
entity.destroy();
```

---

# CAMERA API

```ts
const camera = engine.createPerspectiveCamera();

camera.lookAt();
camera.setPosition();
camera.setRotation();
camera.project();
camera.unproject();
camera.updateProjectionMatrix();
camera.updateViewMatrix();
```

---

# RENDERER API

```ts
renderer.render(scene, camera);
renderer.setSize();
renderer.setPixelRatio();
renderer.setRenderTarget();
renderer.beginFrame();
renderer.endFrame();
renderer.capture();
```

---

# MATERIAL API

```ts
const material = engine.createMaterial({
  shader,
  textures,
  uniforms,
  defines,
});
```

---

# GEOMETRY API

```ts
const mesh = engine.createMesh({
  geometry,
  material,
});
```

---

# GPU API

```ts
engine.gpu.getMemoryUsage();
engine.gpu.getUploadPressure();
engine.gpu.getCapabilities();
engine.gpu.getBackendInfo();
engine.gpu.captureFrame();
engine.gpu.flushUploads();
```

---

# STREAMING API

```ts
engine.streaming.preload();
engine.streaming.evict();
engine.streaming.setBudget();
engine.streaming.setPriority();
engine.streaming.pause();
engine.streaming.resume();
```

---

# PROFILER API

```ts
engine.profiler.begin();
engine.profiler.end();
engine.profiler.capture();
engine.profiler.exportTrace();
engine.profiler.getFrameStats();
```

---

# DEBUG API

```ts
engine.debug.showBounds();
engine.debug.showOverdraw();
engine.debug.showVisibility();
engine.debug.showGPUUploads();
engine.debug.showFrameGraph();
engine.debug.showWireframe();
engine.debug.showNormals();
```

---

# VIDEO API

```ts
const timeline = engine.video.createTimeline();

timeline.addTrack();
timeline.addClip();
timeline.play();
timeline.pause();
timeline.seek();
timeline.setTime();
```

---

# VOLUME API

```ts
const volume = engine.volume.loadDICOM();

volume.setTransferFunction();
volume.setSlice();
volume.setWindowLevel();
volume.setSegmentation();
```

---

# GIS API

```ts
engine.gis.loadTiles();
engine.gis.setProjection();
engine.gis.setOrigin();
engine.gis.enableStreaming();
engine.gis.setLOD();
```

---

# TASK SYSTEM API

```ts
engine.scheduler.schedule();
engine.scheduler.cancel();
engine.scheduler.setPriority();
engine.scheduler.getFrameBudget();
engine.scheduler.pause();
engine.scheduler.resume();
```

---

# RUNTIME POLICY API

```ts
engine.runtime.setMemoryBudget();
engine.runtime.setUploadBudget();
engine.runtime.setVisibilityBudget();
engine.runtime.setFrameBudget();
engine.runtime.setGPUBudget();
```

---

# CORE ENGINE PRINCIPLES

## Runtime First

The engine should be:

```txt
runtime-driven
scheduler-driven
visibility-driven
streaming-driven
pressure-aware
```

not document-driven.

---

## Everything Incremental

Avoid:

```txt
full rebuild
full traversal
full upload
```

Prefer:

```txt
dirty propagation
partial invalidation
incremental evaluation
```

---

## GPU-Aware Architecture

Modern bottlenecks are usually:

- upload pressure
- synchronization
- memory residency
- bandwidth
- visibility
- overdraw

not raw draw calls.

---

## Unified Composition Runtime

The runtime must unify:

- 2D
- 3D
- Video
- UI
- GIS
- Volume
- CAD
- Editor overlays

into one compositing architecture.

---

# DEEPER RUNTIME ARCHITECTURE

The current structure is already sufficient for a medium-scale renderer.

However:

for:

- CAD
- GIS
- Medical
- Video
- Massive scenes
- Infinite canvas
- Runtime/editor convergence
- Multi-view rendering
- Streaming worlds

additional architectural separation becomes mandatory.

---

# CRITICAL MISSING LAYERS

The current architecture is still missing:

```txt
Document Layer
Resource Layer
Compilation Layer
Composition Layer
Presentation Layer
```

Without them:

large runtime complexity eventually collapses into:

```txt
scene-driven spaghetti runtime
```

---

# RECOMMENDED FINAL RUNTIME STACK

```txt
Application Layer
↓
Document Layer
↓
Authoring Layer
↓
Compilation Layer
↓
Runtime ECS Layer
↓
Simulation Layer
↓
Visibility Layer
↓
Composition Layer
↓
Render Graph Layer
↓
GPU Resource Layer
↓
Backend Layer
↓
Presentation Layer
```

---

# DOCUMENT LAYER

Current architecture still underestimates document complexity.

For:

- vector editors
- CAD
- BIM
- timeline editors
- medical annotations
- collaborative editing

Document architecture becomes extremely important.

---

## Required Document Concepts

```txt
Document
DocumentNode
DocumentGraph
DocumentVersion
DocumentRevision
DocumentTransaction
CommandBuffer
UndoStack
RedoStack
ChangeSet
DeltaPatch
CollaborativeState
CRDT
OperationalTransform
PersistenceLayer
Autosave
Checkpoint
```

---

## Recommended Structure

```txt
src/document/
 ├── Document.ts
 ├── DocumentNode.ts
 ├── DocumentGraph.ts
 ├── DocumentVersion.ts
 ├── DocumentHistory.ts
 ├── Transaction.ts
 ├── Command.ts
 ├── UndoRedo.ts
 ├── ChangeSet.ts
 ├── DeltaPatch.ts
 ├── CRDT.ts
 ├── Persistence.ts
 └── Serializer.ts
```

---

# AUTHORING VS RUNTIME SPLIT

A major industrial-engine rule:

```txt
Authoring State != Runtime State
```

Never directly render document nodes.

Instead:

```txt
Document
↓ compile
Runtime ECS
↓ extract
Render Data
↓ build
GPU Commands
```

---

# SCENE COMPILATION LAYER

Current structure is still missing a dedicated compiler layer.

Large engines internally compile scenes.

Examples:

- Unreal
- Unity DOTS
- Frostbite
- Omniverse
- Blender depsgraph

all contain:

```txt
scene compilation systems
```

---

## Recommended Compilation Flow

```txt
Document Nodes
↓
Dependency Resolution
↓
Transform Flattening
↓
Material Compilation
↓
Visibility Registration
↓
Spatial Registration
↓
GPU Resource Compilation
↓
Runtime ECS Extraction
```

---

## Recommended Structure

```txt
src/compiler/
 ├── SceneCompiler.ts
 ├── TransformCompiler.ts
 ├── MaterialCompiler.ts
 ├── GeometryCompiler.ts
 ├── VisibilityCompiler.ts
 ├── RuntimeExtractor.ts
 ├── GPUCompiler.ts
 └── IncrementalCompiler.ts
```

---

# COMPOSITION LAYER

This becomes mandatory for:

- video editors
- UI systems
- 2D + 3D hybrid rendering
- overlays
- postprocessing
- multiple cameras
- offscreen rendering
- portals
- minimaps
- editor tooling

---

# RENDER LAYERING ARCHITECTURE

The engine should explicitly support:

```txt
multi-layer rendering
```

This is mandatory for:

- vector editors
- CAD editors
- infinite canvas systems
- selection rendering
- hover rendering
- editor overlays
- collaborative cursors
- partial redraw
- offscreen caching
- dirty-region rendering
- hybrid GPU/CPU composition

The previous:

```txt
base
active
overlay
```

layering model is correct.

However:

large runtimes require this concept to evolve into:

```txt
RenderLayerSystem
```

instead of:

```txt
hardcoded canvas layers
```

---

# RECOMMENDED RENDER LAYERS

```txt
BackgroundLayer
DocumentLayer
ContentLayer
TileLayer
CachedLayer
InteractionLayer
SelectionLayer
HoverLayer
GuideLayer
GizmoLayer
AnnotationLayer
OverlayLayer
DebugLayer
PresentationLayer
```

Not all applications need all layers.

The runtime should allow:

```txt
custom layer composition
```

per application.

---

# LAYER RESPONSIBILITIES

## BackgroundLayer

Responsible for:

- checkerboards
- paper background
- infinite canvas background
- environment background
- viewport clear

Usually:

```txt
static
```

and rarely invalidated.

---

## DocumentLayer

Contains:

- stable document content
- immutable render cache
- static geometry
- tile cache
- large vector content

This layer should aggressively use:

```txt
tiling
raster cache
partial redraw
incremental uploads
```

This becomes the largest performance layer.

---

## InteractionLayer

Contains:

- dragging objects
- transform previews
- active editing paths
- temporary previews
- brush previews
- marquee previews

This layer should optimize for:

```txt
low latency
high frequency redraw
small dirty region
```

This is conceptually similar to your previous:

```txt
active
```

layer.

---

## SelectionLayer

Contains:

- selection bounds
- resize handles
- rotation handles
- anchor points
- path controls
- editing vertices

This layer should:

```txt
never trigger full scene redraw
```

Selection rendering should remain isolated.

---

## OverlayLayer

Contains:

- guides
- rulers
- snapping visuals
- comments
- collaborative cursors
- measurement overlays
- diagnostics overlays

This corresponds to your previous:

```txt
overlay
```

layer.

---

# LAYER INVALIDATION MODEL

Each layer should own:

```txt
DirtyRegion
VisibilityState
CacheState
RedrawPolicy
UploadPolicy
CompositePolicy
```

The engine should NEVER do:

```txt
global redraw
```

unless forced.

---

# INTERACTION RUNTIME ARCHITECTURE

The current interaction architecture is still too editor-centric.

Large-scale runtimes require:

```txt
interaction runtime separation
```

instead of:

```txt
pointer event callbacks directly manipulating scene state
```

The runtime should explicitly separate:

```txt
Input Collection
↓
Interaction Routing
↓
Picking Resolution
↓
Gesture Recognition
↓
Tool Dispatch
↓
Command Generation
↓
Document Mutation
↓
Incremental Invalidation
```

---

# INTERACTION PIPELINE

Correct interaction pipeline:

```txt
DOM/Event Source
↓
Input Normalization
↓
Viewport Mapping
↓
Interaction Context
↓
Picking Pipeline
↓
Gesture Resolver
↓
Tool Runtime
↓
Command Buffer
↓
Document Transaction
↓
Incremental Compilation
↓
Partial Redraw
```

The runtime should NEVER directly:

```txt
pointermove → mutate scene → redraw all
```

---

# INTERACTION CONTEXT

Each viewport should own independent:

```txt
InteractionContext
```

Containing:

- pointer state
- gesture state
- hover state
- active tool
- focus state
- drag state
- selection state
- snapping state
- modifier keys
- pressure/pen state
- XR controller state

This avoids:

```txt
global interaction coupling
```

between multiple editors or viewports.

---

# GESTURE SYSTEM

The runtime should separate:

```txt
raw input
```

from:

```txt
gesture semantics
```

Examples:

- pan
- pinch zoom
- rotate
- lasso
- marquee
- drag
- hover intent
- long press
- stylus pressure draw
- XR grab
- two-hand transform

Recommended structure:

```txt
src/interaction/
 ├── InputSystem.ts
 ├── PointerTracker.ts
 ├── GestureRecognizer.ts
 ├── GestureArena.ts
 ├── PointerCapture.ts
 ├── InputRouter.ts
 ├── HoverTracker.ts
 ├── FocusManager.ts
 ├── DragSession.ts
 ├── ToolContext.ts
 ├── ToolRuntime.ts
 ├── ToolDispatcher.ts
 ├── ShortcutManager.ts
 ├── InteractionState.ts
 └── InteractionMetrics.ts
```

---

# TOOL RUNTIME

Tools should become:

```txt
stateful runtime actors
```

instead of:

```txt
temporary callback handlers
```

Correct tool model:

```txt
Tool
 ├── interaction lifecycle
 ├── command generation
 ├── overlay extraction
 ├── snapping queries
 ├── preview rendering
 ├── cursor policy
 ├── gesture ownership
 └── invalidation hints
```

This becomes critical for:

- CAD editing
- path editing
- animation editing
- sculpting
- GIS measurement tools
- collaborative editing
- XR manipulation

---

# COMMAND BUFFER ARCHITECTURE

Interactions should NOT directly mutate runtime ECS.

Correct architecture:

```txt
Interaction
↓
Tool Runtime
↓
Command Buffer
↓
Document Transaction
↓
Incremental Compiler
↓
Runtime Extraction
```

This enables:

- undo/redo
- replay
- collaborative synchronization
- deterministic testing
- network streaming
- macro recording
- transactional editing

---

# INTERACTION VS RENDER SEPARATION

The interaction runtime should NOT depend on:

```txt
render backend implementation
```

Interaction systems should operate on:

```txt
interaction proxies
projected bounds
selection proxies
spatial indices
cached geometry
```

instead of:

```txt
GPU draw objects
```

---

# INTERACTION LATENCY STRATEGY

Massive editors should optimize:

```txt
interaction latency
```

instead of:

```txt
visual completeness
```

During:

- drag
- pan
- zoom
- transform
- lasso
- brush drawing

The runtime may temporarily:

- reduce overlay detail
- defer expensive redraw
- reduce geometry precision
- use cached tiles
- use progressive refinement
- reduce GPU uploads

This should be policy-driven.

---

# VIEWPORT ISOLATION

Each viewport should independently own:

```txt
VisibilityContext
PickingContext
InteractionContext
LayerStack
CompositionSurface
```

Avoid:

```txt
shared mutable global viewport state
```

This becomes mandatory for:

- split editors
- minimaps
- detached windows
- XR stereo rendering
- collaborative review tools
- synchronized cameras

---

# TILE-BASED RENDER PLANNING

Large infinite-canvas runtimes should evolve toward:

```txt
tile-driven rendering
```

instead of:

```txt
full viewport redraw
```

Correct architecture:

```txt
Viewport
↓
Visible Tile Resolution
↓
Dirty Tile Resolution
↓
Tile Build Scheduling
↓
Tile Raster/Vector Build
↓
Tile Cache Upload
↓
Layer Composition
↓
Presentation
```

---

# TILE CACHE RESPONSIBILITIES

Each tile should independently own:

```txt
visibility state
cache residency
geometry version
raster version
upload state
priority state
```

This enables:

- incremental redraw
- predictive prefetching
- background tile generation
- asynchronous refinement
- low-latency panning
- zoom stabilization

---

# ZOOM-AWARE RENDERING

The runtime should explicitly support:

```txt
zoom-dependent representation
```

Examples:

```txt
far zoom
 → simplified geometry

mid zoom
 → flattened curves

near zoom
 → exact bezier rendering
```

This applies to:

- rendering
- hit testing
- snapping
- overlays
- guides
- text rendering
- visibility

Avoid:

```txt
single precision pipeline for all zoom levels
```

---

# TEXT RUNTIME

Large editors usually underestimate text complexity.

Text should become an independent runtime subsystem.

Required concepts:

```txt
TextLayout
GlyphCache
Shaping
Bidi
SubpixelLayout
AtlasResidency
LineBreaking
TextSelection
CaretRuntime
IMEBridge
```

Recommended structure:

```txt
src/text/
 ├── TextLayout.ts
 ├── TextShaper.ts
 ├── GlyphAtlas.ts
 ├── GlyphCache.ts
 ├── TextSelection.ts
 ├── CaretRuntime.ts
 ├── IMEBridge.ts
 ├── TextHitTest.ts
 ├── TextRenderer.ts
 └── TextMetrics.ts
```

---

# SNAPPING ARCHITECTURE

Snapping should become:

```txt
query-driven spatial resolution
```

instead of:

```txt
ad hoc nearest point math
```

Correct snapping pipeline:

```txt
Pointer
↓
Spatial Query
↓
Candidate Extraction
↓
Constraint Evaluation
↓
Priority Arbitration
↓
Snap Resolution
↓
Guide Extraction
```

Snapping sources may include:

- geometry anchors
- guides
- grids
- intersections
- constraints
- dimensions
- projected geometry
- collaborative cursors

---

# FRAME PHASE SEPARATION

The runtime should explicitly separate:

```txt
Input Phase
Simulation Phase
Extraction Phase
Render Phase
Presentation Phase
```

Input handling should NEVER block:

```txt
GPU submission
```

Long-running operations should migrate toward:

```txt
asynchronous task execution
```

through:

- worker runtime
- background compilation
- incremental extraction
- progressive rendering
- tile scheduling

---

# SCENE RUNTIME OPTIMIZATION ANALYSIS

The previous architecture already solves:

- backend abstraction
- runtime layering
- render extraction
- resource management
- composition layering
- incremental invalidation

However the following bottlenecks still become critical at scale:

```txt
cross-system synchronization
interaction latency
tile invalidation storms
resource residency pressure
text layout cost
GPU upload bursts
large overlay redraw
multi-viewport duplication
```

The architecture should therefore evolve toward:

```txt
scheduler-centric runtime orchestration
```

instead of:

```txt
renderer-centric orchestration
```

# HIT TEST ARCHITECTURE

Large-scale editors cannot rely on:

```txt
linear traversal hit testing
```

This collapses for:

- CAD
- GIS
- infinite canvas
- large SVG
- collaborative whiteboards
- medical annotation systems
- path editors
- BIM systems
- node graph editors
- XR interaction

The engine must explicitly separate:

```txt
Broad Phase
↓
Candidate Resolution
↓
Narrow Phase
↓
Geometry Accurate Hit
↓
Priority Resolution
↓
Interaction Routing
```

---

# BROAD PHASE

Broad phase should aggressively reduce candidate counts.

Never do:

```txt
full scene hit testing
```

Broad phase structures may include:

- BVH
- Quadtree
- Spatial Hash
- Uniform Grid
- Tile Map
- Cluster Index
- GPU Visibility Buffer
- Region Cache

Broad phase should operate primarily on:

```txt
AABB
OBB
screen bounds
cached projected bounds
```

instead of full geometry.

---

# NARROW PHASE

Narrow phase performs accurate geometry evaluation.

Examples:

- bezier distance evaluation
- stroke expansion hit test
- winding fill test
- triangle barycentric evaluation
- sdf evaluation
- text glyph hit test
- volume ray intersection
- mesh raycast
- spline projection

Narrow phase should only execute on:

```txt
small candidate sets
```

produced by broad phase.

---

# VECTOR HIT TEST PIPELINE

Correct vector hit testing pipeline:

```txt
Pointer
↓
Viewport Projection
↓
Spatial Query
↓
Candidate Set
↓
Path Flatten Cache
↓
Stroke/Fill Evaluation
↓
Anchor/Handle Resolution
↓
Priority Arbitration
↓
Interaction Dispatch
```

---

# PATH HIT TESTING

Bezier-heavy systems should NEVER repeatedly evaluate:

```txt
exact bezier math per pointer move
```

Instead use:

```txt
curve subdivision
flatten cache
segment approximation
multi-resolution geometry
```

Runtime should support:

- adaptive subdivision
- tolerance-based flattening
- zoom-aware precision
- incremental geometry rebuild
- cached projected geometry
- tile-local geometry caches

---

# PENETRATION HIT TESTING

The runtime must support:

```txt
penetration picking
```

instead of returning only:

```txt
top-most target
```

Required for:

- layered editors
- overlapping paths
- CAD selection
- deep hierarchy selection
- alt-click cycling
- XR selection
- debug tooling

Correct pipeline:

```txt
Broad Phase
↓
Candidate Extraction
↓
Depth Sorting
↓
Priority Sorting
↓
Hit Stack
```

---

# GPU PICKING

The engine should support:

```txt
GPU accelerated picking
```

for:

- massive scenes
- millions of objects
- GIS datasets
- scientific visualization
- point clouds
- CAD assemblies

Possible implementations:

- ID buffer
- visibility buffer
- compute picking
- depth pyramid picking
- GPU ray query

GPU picking should remain:

```txt
optional
```

and policy-driven.

---

# PICKING VS VISIBILITY

Visibility systems and picking systems should cooperate.

The engine should reuse:

- visible sets
- tile visibility
- projected bounds
- cluster visibility
- cached screen regions

to reduce picking cost.

Avoid:

```txt
duplicated spatial traversal
```

between rendering and interaction.

---

# INCREMENTAL PICKING

Hit testing should become incremental.

The runtime should cache:

```txt
projected geometry
flattened curves
screen-space bounds
selection proxies
```

and invalidate them only when:

- transform changes
- geometry changes
- viewport changes
- zoom thresholds change

Avoid:

```txt
full hit rebuild per frame
```

---

# MULTI LAYER PICKING

Each render layer may own independent:

```txt
PickingContext
```

Example:

```txt
DocumentLayer
 → geometry picking

SelectionLayer
 → handle picking

OverlayLayer
 → guide picking
```

This architecture prevents:

```txt
interaction coupling
```

between runtime layers.

---

# PICKING ARCHITECTURE RECOMMENDED STRUCTURE

```txt
src/picking/
 ├── HitTestSystem.ts
 ├── PickingPipeline.ts
 ├── BroadPhase.ts
 ├── NarrowPhase.ts
 ├── SpatialPicking.ts
 ├── BVHPicking.ts
 ├── QuadtreePicking.ts
 ├── SpatialHashPicking.ts
 ├── PickingCache.ts
 ├── IncrementalPicking.ts
 ├── RayPicking.ts
 ├── MarqueePicking.ts
 ├── LassoPicking.ts
 ├── HoverPicking.ts
 ├── PenetrationPicking.ts
 ├── StrokeHitTest.ts
 ├── FillHitTest.ts
 ├── BezierHitTest.ts
 ├── TextHitTest.ts
 ├── TilePicking.ts
 └── GPUColorPicking.ts
```

---

# PARTIAL REDRAW PIPELINE

Correct modern editor architecture:

```txt
Input
↓
Interaction Layer Update
↓
Dirty Region Generation
↓
Affected Layer Resolution
↓
Partial Tile Rebuild
↓
Composite
↓
Present
```

instead of:

```txt
clear canvas
redraw everything
```

---

# LAYER COMPOSITION MODEL

The runtime should internally treat layers as:

```txt
compositing surfaces
```

instead of:

```txt
just draw order
```

Each layer may independently use:

- offscreen surface
- retained texture
- tile cache
- render graph pass
- incremental upload
- GPU composition
- CPU composition
- async redraw

---

# RECOMMENDED STRUCTURE

```txt
src/composition/layers/
 ├── RenderLayer.ts
 ├── RenderLayerManager.ts
 ├── LayerSurface.ts
 ├── LayerCache.ts
 ├── LayerInvalidation.ts
 ├── LayerCompositor.ts
 ├── LayerDirtyRegion.ts
 ├── LayerVisibility.ts
 ├── LayerPolicy.ts
 ├── BackgroundLayer.ts
 ├── DocumentLayer.ts
 ├── InteractionLayer.ts
 ├── SelectionLayer.ts
 ├── OverlayLayer.ts
 └── DebugLayer.ts
```

---

# LAYER VS RENDER PASS

Do not confuse:

```txt
Render Layer
```

with:

```txt
Render Pass
```

Render layers are:

```txt
logical compositing partitions
```

Render passes are:

```txt
GPU execution stages
```

One render layer may internally produce:

- multiple render passes
- multiple tiles
- multiple surfaces
- multiple GPU submissions

---

# LAYERED OFFSCREEN STRATEGY

A major future optimization:

```txt
independent layer retention
```

Example:

```txt
DocumentLayer
 → retained texture
 → redraw once

InteractionLayer
 → realtime redraw

OverlayLayer
 → lightweight redraw
```

This architecture is one of the core reasons:

- Figma
- CAD systems
- whiteboard editors
- map runtimes
- video compositors

can scale to massive scenes.

---

# MULTI VIEW LAYERING

Each viewport should own independent:

```txt
LayerStack
```

instead of globally shared layers.

Example:

```txt
Viewport A
 ├── DocumentLayer
 ├── InteractionLayer
 └── OverlayLayer

Viewport B
 ├── CachedPreviewLayer
 └── SelectionLayer
```

This becomes mandatory for:

- minimaps
- detached windows
- editor previews
- XR stereo rendering
- multi-camera editors

---

## Recommended Composition Graph

```txt
CompositionGraph
 ├── Layer
 ├── Surface
 ├── CompositionPass
 ├── OverlayPass
 ├── VideoPass
 ├── UIPass
 ├── ScenePass
 └── PostProcessPass
```

---

## Recommended Structure

```txt
src/composition/
 ├── CompositionGraph.ts
 ├── CompositionLayer.ts
 ├── Surface.ts
 ├── SurfaceManager.ts
 ├── OverlayComposition.ts
 ├── ViewportComposition.ts
 ├── MultiViewComposition.ts
 └── PresentationComposer.ts
```

---

# MULTI VIEWPORT ARCHITECTURE

Massive editors require:

- multiple cameras
- minimaps
- split views
- orthographic + perspective
- detached windows
- offscreen previews

Never assume:

```txt
single renderer = single viewport
```

---

## Recommended View System

```txt
Viewport
 ├── Camera
 ├── Surface
 ├── RenderGraph
 ├── CompositionLayer
 ├── VisibilityContext
 └── InteractionContext
```

---

## Recommended Structure

```txt
src/view/
 ├── Viewport.ts
 ├── ViewportManager.ts
 ├── ViewContext.ts
 ├── CameraContext.ts
 ├── InteractionContext.ts
 ├── SurfaceViewport.ts
 └── MultiViewport.ts
```

---

# RESOURCE SYSTEM

Current structure still treats GPU resources too lightly.

Modern engines are actually:

```txt
resource management systems
```

---

## Required Concepts

```txt
Asset
AssetHandle
Resource
ResourceHandle
ResourceLifetime
TransientResource
PersistentResource
ResourceResidency
ResourceVersion
ReferenceCounting
WeakReference
StreamingPriority
```

---

## Recommended Structure

```txt
src/resources/
 ├── Asset.ts
 ├── AssetManager.ts
 ├── AssetRegistry.ts
 ├── Resource.ts
 ├── ResourceManager.ts
 ├── ResourceCache.ts
 ├── ResourceHandle.ts
 ├── ResidencyManager.ts
 ├── LifetimeTracker.ts
 ├── StreamingPriority.ts
 └── ResourceGC.ts
```

---

# SHADER SYSTEM

The current shader structure is still too shallow.

Industrial engines need:

```txt
shader compilation infrastructure
```

---

## Required Concepts

```txt
ShaderVariant
ShaderPermutation
ShaderKeyword
ShaderReflection
ShaderGraph
ShaderCache
ShaderHotReload
PipelineCache
MaterialInstance
```

---

## Recommended Structure

```txt
src/shader/
 ├── Shader.ts
 ├── ShaderCompiler.ts
 ├── ShaderVariant.ts
 ├── ShaderPermutation.ts
 ├── ShaderKeyword.ts
 ├── ShaderReflection.ts
 ├── ShaderGraph.ts
 ├── Material.ts
 ├── MaterialInstance.ts
 └── PipelineCache.ts
```

---

# FRAME PIPELINE

The engine should explicitly separate:

```txt
Input Frame
Simulation Frame
Render Frame
Presentation Frame
```

These are NOT always synchronized.

Especially for:

- video
- streaming
- cloud rendering
- XR
- async compute
- replay systems

---

## Recommended Pipeline

```txt
Input
↓
Command Buffer
↓
Simulation Tick
↓
Visibility Update
↓
Render Extraction
↓
Render Graph Build
↓
GPU Submission
↓
Presentation
```

---

# RENDER EXTRACTION

Large engines usually separate:

```txt
game thread
↓ extract
render thread
```

You need similar architecture.

---

## Recommended Flow

```txt
Runtime ECS
↓
Extracted Render State
↓
Render Queue
↓
Render Graph
↓
GPU Commands
```

---

## Recommended Structure

```txt
src/render-extraction/
 ├── RenderExtractor.ts
 ├── ExtractedCamera.ts
 ├── ExtractedMesh.ts
 ├── ExtractedMaterial.ts
 ├── ExtractedLight.ts
 ├── RenderScene.ts
 └── RenderWorld.ts
```

---

# THREADING MODEL

The current architecture still lacks explicit threading design.

Future runtime pressure will require:

```txt
main thread
worker thread
render worker
streaming worker
decoder worker
physics worker
```

---

## Recommended Structure

```txt
src/threading/
 ├── WorkerRuntime.ts
 ├── TaskChannel.ts
 ├── SharedMemory.ts
 ├── MessageBridge.ts
 ├── SABQueue.ts
 ├── RenderWorker.ts
 ├── StreamingWorker.ts
 ├── DecoderWorker.ts
 └── PhysicsWorker.ts
```

---

# MEMORY ARCHITECTURE

Current architecture still lacks allocator strategy.

For large runtime systems:

allocation strategy becomes critical.

---

## Required Concepts

```txt
ArenaAllocator
PoolAllocator
ChunkAllocator
FrameAllocator
LinearAllocator
SoA
PackedArray
SparseArray
TransientMemory
```

---

## Recommended Structure

```txt
src/memory/
 ├── ArenaAllocator.ts
 ├── PoolAllocator.ts
 ├── FrameAllocator.ts
 ├── ChunkAllocator.ts
 ├── SparseArray.ts
 ├── PackedArray.ts
 ├── TransientMemory.ts
 └── MemoryTracker.ts
```

---

# EVENT & REACTIVE SYSTEM

Large editors require:

```txt
reactive invalidation graphs
```

not naive event emitters.

---

## Recommended Structure

```txt
src/reactivity/
 ├── Signal.ts
 ├── ReactiveNode.ts
 ├── DependencyGraph.ts
 ├── Invalidator.ts
 ├── ComputedState.ts
 ├── DerivedState.ts
 └── Observer.ts
```

---

# EDITOR RUNTIME CONVERGENCE

Your architecture direction strongly implies:

```txt
Editor Runtime === Engine Runtime
```

This is extremely important.

Avoid:

```txt
separate editor renderer
```

Instead:

```txt
Editor = Runtime + Tooling Layer
```

---

# GPU DRIVEN DIRECTION

Long-term rendering should evolve toward:

```txt
GPU Driven Rendering
```

instead of:

```txt
CPU scene traversal renderer
```

---

## Required Future Concepts

```txt
Indirect Draw
GPU Culling
GPU Visibility
Mesh Shader
Task Shader
Bindless Rendering
Persistent Mapping
GPU Scene
```

---

# PLATFORM ABSTRACTION

The current backend layer is still too graphics-oriented.

Future abstraction should include:

```txt
graphics
compute
video decode
video encode
filesystem
networking
worker runtime
input system
```

---

## Recommended Structure

```txt
src/platform/
 ├── Platform.ts
 ├── GraphicsPlatform.ts
 ├── ComputePlatform.ts
 ├── VideoPlatform.ts
 ├── FileSystem.ts
 ├── Network.ts
 ├── Input.ts
 ├── Clipboard.ts
 └── WorkerPlatform.ts
```

---

# MOST IMPORTANT FUTURE PROBLEM

The biggest future complexity will NOT be:

```txt
rendering
```

It will become:

```txt
runtime synchronization
resource lifetime
incremental invalidation
streaming pressure
cross-system dependency management
```

That is where large realtime engines become difficult.

# LONG TERM DIRECTION

The engine should evolve toward:

```txt
Universal Realtime Runtime Platform
```

similar in architectural complexity to:

- browser engines
- game engines
- CAD runtimes
- GIS runtimes
- scientific visualization runtimes
- realtime compositors

combined into one runtime ecosystem.

---

# RUNTIME LAYERING REFACTOR (NEXT GENERATION)

The previous architecture is already sufficient for:

- medium-scale rendering
- editor runtimes
- hybrid 2D/3D systems
- streaming visualization

However:

for:

- CAD
- GIS
- medical imaging
- scientific visualization
- infinite canvas systems
- cloud rendering
- digital twin platforms
- runtime/editor convergence
- realtime compositing
- XR
- massive collaborative editors

another architectural transition becomes mandatory.

The engine must evolve from:

```txt
Renderer Architecture
```

into:

```txt
Realtime Runtime Operating System
```

---

# CORE ARCHITECTURAL TRANSITION

The current architecture is still partially:

```txt
scene → renderer → gpu
```

This is insufficient for large-scale realtime systems.

The engine should evolve toward:

```txt
Document Runtime
↓
Runtime Simulation
↓
Extraction Layer
↓
Composition Runtime
↓
Render Runtime
↓
GPU Execution
↓
Presentation Runtime
```

---

# FINAL RUNTIME LAYERING

```txt
Application Layer
↓
Authoring Layer
↓
Document Layer
↓
Compilation Layer
↓
Runtime ECS Layer
↓
Simulation Layer
↓
Extraction Layer
↓
Composition Layer
↓
Render Planning Layer
↓
Render Execution Layer
↓
GPU Resource Layer
↓
Backend Layer
↓
Presentation Layer
↓
Platform Layer
```

---

# NEW RECOMMENDED DIRECTORY STRUCTURE

```txt
packages/
 └── engine/
      └── src/
           ├── application/
           ├── authoring/
           ├── document/
           ├── compiler/
           ├── ecs/
           ├── simulation/
           ├── extraction/
           ├── composition/
           ├── render-runtime/
           ├── render-planning/
           ├── render-execution/
           ├── renderer/
           ├── resource-graph/
           ├── resources/
           ├── gpu/
           ├── backend/
           ├── presentation/
           ├── threading/
           ├── runtime/
           ├── observability/
           ├── scheduler/
           ├── policy/
           ├── platform/
           ├── streaming/
           ├── interaction/
           ├── picking/
           ├── spatial/
           ├── scene-runtime/
           ├── render-scene/
           ├── view/
           ├── memory/
           ├── shader/
           ├── animation/
           ├── physics/
           ├── volume/
           ├── gis/
           ├── video/
           ├── testing/
           └── api/
```

---

# APPLICATION LAYER

This layer contains:

- editor apps
- runtime apps
- CAD apps
- GIS apps
- video editors
- medical viewers
- cloud streaming frontends

This layer must NEVER directly manipulate:

- GPU resources
- render packets
- backend state
- renderer internals

Applications should only interact with:

```txt
runtime facade api
```

---

# AUTHORING LAYER

This layer contains:

- editor state
- selection state
- guides
- snapping
- inspector state
- overlays
- authoring tools
- collaborative cursors
- command systems
- undo/redo

This layer is NOT runtime rendering.

This layer should remain:

```txt
tool-oriented
```

instead of:

```txt
render-oriented
```

---

# DOCUMENT LAYER

The current engine already behaves partially like:

```txt
document runtime
```

especially in:

- vector editing
- scene patching
- layered rendering
- incremental updates

This layer should become explicit.

---

## REQUIRED DOCUMENT CONCEPTS

```txt
Document
DocumentNode
DocumentGraph
DocumentVersion
DocumentRevision
DocumentTransaction
UndoStack
RedoStack
ChangeSet
DeltaPatch
CollaborativeState
CRDT
OperationalTransform
PersistenceLayer
Autosave
Checkpoint
```

---

## RECOMMENDED STRUCTURE

```txt
src/document/
 ├── Document.ts
 ├── DocumentNode.ts
 ├── DocumentGraph.ts
 ├── DocumentVersion.ts
 ├── DocumentRevision.ts
 ├── Transaction.ts
 ├── UndoRedo.ts
 ├── ChangeSet.ts
 ├── DeltaPatch.ts
 ├── CRDT.ts
 ├── Persistence.ts
 └── Serializer.ts
```

---

# AUTHORING VS RUNTIME VS RENDER SPLIT

One of the most important industrial-engine rules:

```txt
Document State
!=
Runtime State
!=
Render State
!=
GPU State
```

The engine must NEVER directly render document nodes.

Correct pipeline:

```txt
Document
↓ compile
Runtime ECS
↓ extract
Render World
↓ build
GPU Commands
```

---

# COMPILATION LAYER

Large engines internally compile scenes.

Examples:

- Unreal
- Unity DOTS
- Frostbite
- Omniverse
- Blender depsgraph

all contain:

```txt
scene compilation systems
```

---

## REQUIRED COMPILERS

```txt
TransformCompiler
MaterialCompiler
VisibilityCompiler
GeometryCompiler
StreamingCompiler
GPUCompiler
RuntimeExtractor
IncrementalCompiler
```

---

## RECOMMENDED STRUCTURE

```txt
src/compiler/
 ├── SceneCompiler.ts
 ├── IncrementalCompiler.ts
 ├── TransformCompiler.ts
 ├── MaterialCompiler.ts
 ├── GeometryCompiler.ts
 ├── VisibilityCompiler.ts
 ├── RuntimeExtractor.ts
 ├── GPUCompiler.ts
 └── CompilerCache.ts
```

---

# EXTRACTION LAYER

This is currently the largest missing architectural layer.

The engine currently still behaves too closely to:

```txt
scene → renderer
```

Industrial engines instead use:

```txt
runtime world
↓ extract
render world
↓ build
gpu packets
```

---

## EXTRACTION RESPONSIBILITIES

```txt
runtime flattening
visibility extraction
material extraction
render batching
render packet generation
camera extraction
overlay extraction
text extraction
instance extraction
```

---

## RECOMMENDED STRUCTURE

```txt
src/extraction/
 ├── RenderExtractor.ts
 ├── ExtractionContext.ts
 ├── ExtractedScene.ts
 ├── ExtractedCamera.ts
 ├── ExtractedMesh.ts
 ├── ExtractedText.ts
 ├── ExtractedOverlay.ts
 ├── ExtractedTile.ts
 ├── ExtractedVolume.ts
 ├── ExtractedVideo.ts
 └── RenderWorld.ts
```

---

# RENDER RUNTIME

The current renderer folder is overloaded.

It currently mixes:

- planning
- prediction
- visibility
- QoS
- fallback
- execution
- orchestration
- caching
- scheduling
- backend behavior

This eventually creates:

```txt
Renderer God Object
```

The renderer must become smaller.

---

# NEW RENDER LAYER SPLIT

```txt
renderer/
 → pure rendering abstractions

render-runtime/
 → orchestration runtime

render-planning/
 → visibility/lod/roi/progressive logic

render-execution/
 → backend execution layer
```

---

# RENDERER LAYER

The renderer layer should ONLY contain:

```txt
materials
passes
pipelines
surfaces
draw interfaces
render targets
render states
```

---

## RECOMMENDED STRUCTURE

```txt
src/renderer/
 ├── passes/
 ├── pipelines/
 ├── materials/
 ├── shaders/
 ├── surfaces/
 ├── draw/
 ├── targets/
 └── states/
```

---

# RENDER RUNTIME LAYER

This layer owns:

```txt
frame orchestration
submission scheduling
runtime synchronization
invalidation propagation
pressure evaluation
multi-view synchronization
```

---

## RECOMMENDED STRUCTURE

```txt
src/render-runtime/
 ├── frame/
 ├── extraction/
 ├── scheduling/
 ├── submission/
 ├── invalidation/
 ├── synchronization/
 ├── pressure/
 └── orchestration/
```

---

# RENDER PLANNING LAYER

This layer owns:

```txt
visibility
lod
roi
predictive rendering
tiling
streaming prioritization
partial redraw
```

---

## RECOMMENDED STRUCTURE

```txt
src/render-planning/
 ├── visibility/
 ├── lod/
 ├── roi/
 ├── tiling/
 ├── prediction/
 ├── progressive/
 ├── partial-redraw/
 └── planning/
```

---

# RENDER EXECUTION LAYER

This layer should contain:

```txt
backend execution
packet submission
gpu barriers
upload scheduling
command encoding
resource binding
```

---

## RECOMMENDED STRUCTURE

```txt
src/render-execution/
 ├── webgl/
 ├── webgpu/
 ├── packets/
 ├── uploads/
 ├── synchronization/
 ├── barriers/
 └── submission/
```

---

# POLICY GRAPH

The current architecture already shows:

```txt
policy explosion
```

Policies are no longer configuration.

They are:

```txt
runtime decision systems
```

---

# REQUIRED TRANSITION

Avoid:

```txt
if (medical)
if (massiveScene)
if (thermal)
```

Prefer:

```txt
policy graph evaluation
```

---

## RECOMMENDED STRUCTURE

```txt
src/policy/
 ├── graph/
 ├── evaluators/
 ├── arbitration/
 ├── constraints/
 ├── priorities/
 ├── budgets/
 ├── fallback/
 ├── degradation/
 └── specialization/
```

---

# RESOURCE GRAPH

The current runtime already contains:

- caches
- uploads
- tiles
- streaming
- residency
- progressive loading

This means:

```txt
resource management
```

is becoming the true runtime core.

---

# REQUIRED RESOURCE CONCEPTS

```txt
ResourceNode
ResourceEdge
ResourceResidency
ResourceLifetime
UploadDependency
EvictionDependency
TransientResource
PersistentResource
StreamingPriority
```

---

## RECOMMENDED STRUCTURE

```txt
src/resource-graph/
 ├── ResourceNode.ts
 ├── ResourceEdge.ts
 ├── ResidencyGraph.ts
 ├── LifetimeGraph.ts
 ├── UploadGraph.ts
 ├── EvictionGraph.ts
 ├── DependencyGraph.ts
 └── ResourcePressure.ts
```

---

# OBSERVABILITY PLATFORM

The current diagnostics layer is evolving into:

```txt
runtime observability platform
```

not merely:

```txt
debug tooling
```

---

# REQUIRED OBSERVABILITY CONCEPTS

```txt
Trace
Metric
Counter
TimelineEvent
Telemetry
FrameCapture
RuntimeReplay
AnomalyDetection
PressureTracing
```

---

## RECOMMENDED STRUCTURE

```txt
src/observability/
 ├── traces/
 ├── metrics/
 ├── telemetry/
 ├── counters/
 ├── replay/
 ├── anomaly/
 ├── frame-capture/
 ├── dashboards/
 └── exporters/
```

---

# MULTI VIEWPORT ARCHITECTURE

The engine must support:

- split views
- minimaps
- detached windows
- editor previews
- orthographic + perspective
- offscreen rendering
- multi-camera composition
- XR stereo rendering

Never assume:

```txt
single renderer = single viewport
```

---

## RECOMMENDED STRUCTURE

```txt
src/view/
 ├── Viewport.ts
 ├── ViewportManager.ts
 ├── ViewContext.ts
 ├── CameraContext.ts
 ├── InteractionContext.ts
 ├── SurfaceViewport.ts
 ├── MultiViewport.ts
 └── XRViewport.ts
```

---

# THREADING MODEL

Future runtime pressure requires:

```txt
main thread
render worker
streaming worker
decoder worker
physics worker
compression worker
analysis worker
```

The architecture should assume:

```txt
multi-runtime execution
```

from the beginning.

---

## RECOMMENDED STRUCTURE

```txt
src/threading/
 ├── WorkerRuntime.ts
 ├── TaskChannel.ts
 ├── SharedMemory.ts
 ├── MessageBridge.ts
 ├── SABQueue.ts
 ├── RenderWorker.ts
 ├── StreamingWorker.ts
 ├── DecoderWorker.ts
 ├── PhysicsWorker.ts
 └── CompressionWorker.ts
```

---

# FRAME OPERATING SYSTEM

The engine is already evolving beyond:

```txt
render frame
```

The real runtime problem becomes:

```txt
frame ownership
resource scheduling
pressure arbitration
runtime synchronization
```

This means the engine is evolving toward:

```txt
Frame Operating System
```

similar in complexity to:

- Chrome compositor
- Unreal renderer
- Frostbite runtime
- Unity DOTS runtime
- Omniverse runtime

---

# FINAL LONG-TERM DIRECTION

The engine should evolve toward:

```txt
Universal Realtime Runtime Platform
```

combining characteristics of:

- browser engines
- CAD runtimes
- GIS runtimes
- scientific visualization runtimes
- realtime compositors
- game engines
- collaborative editors
- streaming runtimes
- cloud rendering systems

into one unified runtime ecosystem.

---

# COMPLETE ENGINE EXECUTION MODEL

This section describes:

```txt
how the entire runtime actually executes
```

from:

```txt
input
→ document mutation
→ runtime compilation
→ extraction
→ render planning
→ gpu execution
→ presentation
```

This becomes the true operational architecture of the engine.

---

# COMPLETE FRAME EXECUTION PIPELINE

```txt
DOM/Input/Event Source
↓
Input Collection
↓
Input Normalization
↓
Interaction Routing
↓
Picking Pipeline
↓
Gesture Resolution
↓
Tool Runtime
↓
Command Buffer
↓
Document Transaction
↓
Incremental Document Compilation
↓
Runtime ECS Update
↓
Visibility Update
↓
Extraction Phase
↓
Render Planning
↓
Layer Invalidation
↓
Tile Scheduling
↓
Render Graph Build
↓
GPU Resource Resolution
↓
GPU Command Encoding
↓
GPU Submission
↓
Composition
↓
Presentation
```

---

# INPUT SYSTEM EXECUTION

The engine must NEVER directly bind:

```txt
DOM event → render mutation
```

Instead:

```txt
input becomes runtime data
```

---

## INPUT PIPELINE

```txt
DOM Event
↓
Input Device Mapping
↓
Pointer Normalization
↓
Viewport Coordinate Mapping
↓
Interaction Context Update
↓
Gesture Recognition
↓
Tool Dispatch
```

---

## INPUT RESPONSIBILITIES

Input runtime owns:

- pointer normalization
- touch normalization
- stylus pressure
- tilt
- wheel normalization
- XR controller mapping
- keyboard modifiers
- focus ownership
- pointer capture
- IME bridging
- high-frequency coalesced events
- event prediction
- latency smoothing

---

# INTERACTION EXECUTION MODEL

Interaction runtime should behave like:

```txt
state machine orchestration
```

not:

```txt
callback spaghetti
```

---

## INTERACTION PIPELINE

```txt
Input
↓
Interaction Router
↓
Picking Pipeline
↓
Gesture Arena
↓
Tool Ownership Arbitration
↓
Tool Runtime
↓
Command Generation
↓
Document Mutation
```

---

## GESTURE ARENA

Multiple gesture systems may compete simultaneously.

Example:

```txt
pointer drag
├── viewport pan
├── marquee selection
├── path editing
├── node dragging
└── brush stroke
```

Correct architecture:

```txt
GestureArena
```

which arbitrates ownership.

---

# DOCUMENT EXECUTION MODEL

The document layer becomes:

```txt
source of truth
```

The runtime ECS is:

```txt
compiled runtime representation
```

---

## DOCUMENT PIPELINE

```txt
Document Mutation
↓
Transaction Build
↓
ChangeSet Generation
↓
Dependency Resolution
↓
Incremental Compiler
↓
Runtime Extraction
↓
ECS Synchronization
```

---

## DOCUMENT INVALIDATION

Document mutations should produce:

```txt
fine-grained invalidation
```

instead of:

```txt
global rebuild
```

---

## INVALIDATION TYPES

```txt
TransformInvalidation
GeometryInvalidation
MaterialInvalidation
VisibilityInvalidation
TextInvalidation
TileInvalidation
PickingInvalidation
OverlayInvalidation
GPUUploadInvalidation
```

---

# ECS EXECUTION MODEL

The ECS layer is:

```txt
runtime-oriented
```

not:

```txt
authoring-oriented
```

Document structure may be hierarchical.

Runtime ECS should instead optimize for:

- traversal
- visibility
- cache locality
- parallel execution
- extraction
- simulation

---

## ECS STORAGE STRATEGY

Prefer:

```txt
SoA
packed arrays
chunk iteration
archetype grouping
```

Avoid:

```txt
pointer-heavy object graphs
```

---

# VISIBILITY EXECUTION MODEL

Visibility should become:

```txt
predictive runtime infrastructure
```

not merely:

```txt
camera frustum culling
```

---

## VISIBILITY RESPONSIBILITIES

Visibility runtime owns:

- frustum culling
- occlusion culling
- HZB culling
- ROI estimation
- LOD selection
- streaming priority
- tile visibility
- overlay visibility
- text visibility
- viewport-specific visibility
- predictive visibility

---

## VISIBILITY PIPELINE

```txt
Camera State
↓
Viewport State
↓
Spatial Query
↓
Visible Set Build
↓
LOD Resolution
↓
Streaming Resolution
↓
Extraction Candidate Set
```

---

# HIT TEST EXECUTION MODEL

Hit testing should operate independently from rendering.

Never rely on:

```txt
gpu draw order traversal
```

---

## HIT TEST PIPELINE

```txt
Pointer
↓
Viewport Projection
↓
Broad Phase
↓
Candidate Extraction
↓
Narrow Phase
↓
Geometry Accurate Evaluation
↓
Priority Resolution
↓
Penetration Stack Build
↓
Interaction Dispatch
```

---

## BROAD PHASE RESPONSIBILITIES

Broad phase should aggressively eliminate:

```txt
non-relevant geometry
```

using:

- quadtree
- BVH
- spatial hash
- tile visibility
- screen-space bounds
- projected bounds
- region cache

---

## NARROW PHASE RESPONSIBILITIES

Narrow phase should execute:

```txt
exact geometry evaluation
```

Examples:

- bezier projection
- stroke expansion
- winding fill evaluation
- sdf evaluation
- glyph hit testing
- ray intersection
- barycentric testing

---

# TILE RUNTIME EXECUTION

Large scenes should evolve toward:

```txt
tile-centric execution
```

instead of:

```txt
viewport redraw execution
```

---

## TILE PIPELINE

```txt
Viewport
↓
Visible Tile Resolution
↓
Dirty Tile Resolution
↓
Tile Priority Evaluation
↓
Tile Build Scheduling
↓
Background Tile Build
↓
GPU Upload
↓
Composition Surface Update
```

---

## TILE STATES

Each tile should independently own:

```txt
visibility
residency
build version
upload state
priority
cache state
refinement level
```

---

# LAYER EXECUTION MODEL

Render layers should behave like:

```txt
independent compositing runtimes
```

not:

```txt
draw-order buckets
```

---

## LAYER PIPELINE

```txt
Layer Invalidation
↓
Dirty Region Resolution
↓
Tile Resolution
↓
Layer Build
↓
Layer Surface Update
↓
Composition Merge
```

---

## LAYER SPECIALIZATION

Different layers optimize for different runtime behavior.

### DocumentLayer

Optimized for:

- retention
- tile cache
- raster reuse
- async rebuild
- stable rendering

### InteractionLayer

Optimized for:

- latency
- realtime updates
- low redraw cost
- transient rendering

### OverlayLayer

Optimized for:

- lightweight redraw
- diagnostics
- guides
- snapping
- cursors

---

# EXTRACTION EXECUTION MODEL

Extraction is one of the most important architectural separations.

The renderer must NEVER directly traverse:

```txt
runtime scene state
```

during GPU execution.

---

## EXTRACTION PIPELINE

```txt
Runtime ECS
↓
Visible Runtime Entities
↓
Extracted Render State
↓
Render Packets
↓
Render Queues
↓
Render Graph
```

---

## EXTRACTION RESPONSIBILITIES

Extraction runtime owns:

- flattening
- batching
- sorting
- visibility extraction
- text extraction
- overlay extraction
- instance extraction
- material resolution
- packet generation

---

# RENDER PLANNING EXECUTION

Render planning should become:

```txt
predictive orchestration
```

instead of:

```txt
immediate rendering
```

---

## RENDER PLANNING RESPONSIBILITIES

- ROI estimation
- progressive refinement
- predictive tile scheduling
- upload throttling
- frame budgeting
- degradation policies
- LOD arbitration
- multi-view coordination
- GPU pressure management

---

## RENDER PLANNING PIPELINE

```txt
Visible Set
↓
ROI Resolution
↓
Frame Budget Evaluation
↓
Priority Arbitration
↓
Tile Scheduling
↓
Upload Scheduling
↓
Render Queue Build
```

---

# GPU EXECUTION MODEL

GPU execution should become:

```txt
resource-driven
```

instead of:

```txt
draw-call-driven
```

---

## GPU EXECUTION PIPELINE

```txt
Render Graph
↓
Transient Resource Allocation
↓
Barrier Planning
↓
Pass Scheduling
↓
Command Encoding
↓
Upload Submission
↓
GPU Queue Submission
↓
Presentation Synchronization
```

---

## GPU RESOURCE STRATEGY

The runtime should aggressively optimize:

- upload batching
- persistent buffers
- transient allocation
- bindless resources
- atlas reuse
- residency pressure
- async uploads
- deferred destruction
- pipeline reuse

---

# STREAMING EXECUTION MODEL

Streaming becomes:

```txt
continuous runtime orchestration
```

not:

```txt
background asset loading
```

---

## STREAMING RESPONSIBILITIES

- texture residency
- geometry residency
- tile residency
- video streaming
- GIS tile streaming
- progressive loading
- predictive prefetching
- upload pacing
- memory pressure balancing

---

## STREAMING PIPELINE

```txt
Visibility Prediction
↓
Streaming Priority Build
↓
Background Fetch
↓
Decode
↓
GPU Upload
↓
Residency Registration
↓
Progressive Refinement
```

---

# FRAME BUDGET SYSTEM

The runtime should explicitly own:

```txt
frame budget arbitration
```

instead of hoping:

```txt
everything fits inside 16ms
```

---

## BUDGET TYPES

```txt
CPU Budget
GPU Budget
Upload Budget
Streaming Budget
Tile Build Budget
Visibility Budget
Interaction Budget
Physics Budget
Text Layout Budget
```

---

## BUDGET ARBITRATION

When runtime pressure increases:

The engine may:

- reduce LOD
- reduce overlay detail
- defer uploads
- defer tile rebuild
- use cached surfaces
- reduce curve precision
- throttle streaming
- lower shadow quality
- lower text detail
- pause refinement

All policy-driven.

---

# MULTI VIEWPORT EXECUTION

Each viewport should behave like:

```txt
independent runtime sandbox
```

---

## VIEWPORT OWNERSHIP

Each viewport owns:

```txt
Camera
VisibilityContext
PickingContext
InteractionContext
LayerStack
CompositionSurface
RenderGraph
```

---

## MULTI VIEW SYNCHRONIZATION

Shared resources may include:

- geometry
- textures
- visibility caches
- tile caches
- extracted packets
- streaming residency

while interaction/runtime state remains isolated.

---

# THREADING EXECUTION MODEL

Future runtime pressure requires:

```txt
parallel runtime execution
```

---

## THREAD RESPONSIBILITIES

### Main Thread

- input
- presentation
- UI integration
- orchestration

### Render Worker

- render graph build
- command encoding
- extraction

### Streaming Worker

- asset decode
- tile build
- compression

### Physics Worker

- simulation
- collision
- constraints

### Analysis Worker

- diagnostics
- telemetry
- profiling

---

# OBSERVABILITY EXECUTION MODEL

The runtime should expose:

```txt
full execution visibility
```

---

## REQUIRED RUNTIME INSIGHT

The engine should visualize:

- invalidation propagation
- tile rebuilds
- upload bursts
- visibility cost
- extraction cost
- GPU stalls
- memory pressure
- streaming latency
- frame budget pressure
- interaction latency

---

# FINAL ENGINE DIRECTION

The engine is no longer merely:

```txt
renderer infrastructure
```

It evolves toward:

```txt
realtime runtime operating system
```

capable of powering:

- CAD
- GIS
- scientific visualization
- vector editors
- medical runtimes
- cloud rendering
- collaborative editing
- video compositing
- XR systems
- simulation systems
- infinite canvas runtimes
- digital twin platforms
- AI-assisted authoring systems

through one unified runtime architecture.
