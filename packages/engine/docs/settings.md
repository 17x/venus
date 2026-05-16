

# Venus Engine — Runtime Settings & Quality Policy System

## Overview

Modern renderers are NOT fixed rendering pipelines.

Modern renderers are:

```txt
Dynamic Runtime Budget Systems
```

The renderer must continuously balance:

- image quality
- frame stability
- memory usage
- GPU usage
- CPU usage
- latency
- streaming pressure
- thermal/power constraints

The purpose of the settings system is NOT:

```txt
Expose random rendering flags
```

The purpose IS:

```txt
Provide runtime policy control
```

---

# Core Architecture

```txt
User Settings
→ Quality Preset
→ Runtime Policy
→ Runtime Budget
→ Render Strategy
→ GPU Backend
```

NOT:

```txt
User
→ GPU API
```

---

# Core Principles

## 1. User Settings Are Abstract

Users should understand:

- Performance Mode
- Battery Saver
- Ultra Quality
- Balanced

Users should NOT understand:

- GPU upload budget
- visibility buffer size
- tile cache fragmentation
- async upload threshold

---

## 2. Runtime Policies Drive The Renderer

The renderer should adapt based on:

- machine capability
- GPU pressure
- frame time
- scene complexity
- visibility count
- memory pressure
- streaming pressure

---

## 3. Dynamic Scaling Is Mandatory

Large retained renderers MUST support:

```txt
Dynamic Quality Scaling
```

Otherwise:

- low-end machines collapse
- mobile overheats
- VRAM explodes
- frame pacing becomes unstable

---

# Recommended Directory Structure

```txt
settings/
├── graphics/
├── performance/
├── runtime/
├── presets/
├── scaling/
├── budget/
├── device/
├── diagnostics/
└── debug/
```

---

# System Responsibilities

## graphics/

User-facing rendering quality.

Example settings:

```txt
renderScale
resolutionScale
maxFPS
vsync
msaa
hdr
anisotropicFiltering
shadowQuality
textureQuality
postProcess
motionBlur
ambientOcclusion
```

These are:

```txt
visual quality policies
```

NOT raw GPU state.

---

## performance/

Frame-time and runtime stability policies.

Example settings:

```txt
frameTimeBudget
backgroundFrameRate
maxVisibleObjects
maxDrawCalls
maxGpuUploadPerFrame
maxWorkerTasks
```

These are:

```txt
runtime throughput constraints
```

---

## runtime/

Core renderer behavior toggles.

Example settings:

```txt
partialRedraw
retainedRendering
asyncTessellation
asyncTextureUpload
gpuCulling
occlusionCulling
progressiveRendering
```

These control:

```txt
runtime architecture strategy
```

---

## presets/

High-level user presets.

Example:

```txt
Low
Medium
High
Ultra
Balanced
BatterySaver
```

Presets should map to:

```txt
RuntimePolicy
```

NOT directly to GPU backend.

---

## scaling/

Dynamic quality scaling.

Responsibilities:

- adaptive render scale
- adaptive LOD
- adaptive shadow quality
- adaptive cache resolution
- adaptive streaming budget

This system should monitor:

```txt
frameTime
GPUTime
CPUTime
memoryPressure
visibilityPressure
```

---

## budget/

Runtime budget management.

Example budgets:

```txt
GPU upload budget
texture memory budget
geometry cache budget
tile cache budget
streaming budget
worker time budget
frame time budget
```

Modern renderers are:

```txt
Budget-constrained systems
```

---

## device/

Hardware capability detection.

Responsibilities:

- GPU tier detection
- memory detection
- thread count
- WebGPU support
- WebGL capability
- mobile detection
- thermal profile estimation

Should produce:

```txt
DeviceCapabilityProfile
```

---

## diagnostics/

Runtime diagnostics.

Responsibilities:

- frame pacing
- memory pressure
- cache hit rate
- GPU upload spikes
- visibility pressure
- draw-call spikes
- streaming pressure

---

## debug/

Internal developer overrides.

Example:

```txt
showTileBounds
showLOD
showVisibleSet
showOcclusion
showGPUUpload
showCacheStats
```

Must NOT ship as public settings.

---

# Recommended File Structure

```txt
settings/
├── graphics/
│   ├── GraphicsSettings.ts
│   ├── RenderScale.ts
│   ├── ShadowQuality.ts
│   ├── TextureQuality.ts
│   ├── PostProcessSettings.ts
│   └── AntiAliasing.ts
│
├── performance/
│   ├── PerformanceSettings.ts
│   ├── FrameBudget.ts
│   ├── UploadBudget.ts
│   ├── WorkerBudget.ts
│   └── VisibilityBudget.ts
│
├── runtime/
│   ├── RuntimeSettings.ts
│   ├── RuntimePolicy.ts
│   ├── RenderPolicy.ts
│   ├── StreamingPolicy.ts
│   └── CachePolicy.ts
│
├── presets/
│   ├── QualityPreset.ts
│   ├── PresetRegistry.ts
│   ├── LowPreset.ts
│   ├── MediumPreset.ts
│   ├── HighPreset.ts
│   ├── UltraPreset.ts
│   └── BalancedPreset.ts
│
├── scaling/
│   ├── AutoQualityScaler.ts
│   ├── DynamicResolution.ts
│   ├── AdaptiveLOD.ts
│   ├── AdaptiveCacheScale.ts
│   └── RuntimePressureMonitor.ts
│
├── budget/
│   ├── RuntimeBudget.ts
│   ├── MemoryBudget.ts
│   ├── TextureBudget.ts
│   ├── GeometryBudget.ts
│   ├── TileCacheBudget.ts
│   └── UploadBudget.ts
│
├── device/
│   ├── DeviceCapability.ts
│   ├── GPUCapability.ts
│   ├── WebGPUCapability.ts
│   ├── MemoryCapability.ts
│   ├── DeviceTier.ts
│   └── CapabilityDetector.ts
│
├── diagnostics/
│   ├── FrameDiagnostics.ts
│   ├── RuntimePressure.ts
│   ├── GPUProfiler.ts
│   ├── CacheDiagnostics.ts
│   └── VisibilityDiagnostics.ts
│
└── debug/
    ├── DebugRenderSettings.ts
    ├── DebugOverlaySettings.ts
    ├── VisualizationFlags.ts
    └── RuntimeInspector.ts
```

---

# Dynamic Quality Scaling

Modern rendering systems should dynamically adapt.

Example:

```txt
if frameTime > 16ms:
    lower render scale
    lower LOD distance
    reduce shadow resolution
    reduce streaming pressure
```

This is standard in:

- Unreal Engine
- Unity
- modern AAA games
- Blender viewport
- CAD systems

---

# Recommended Runtime Adaptation Flow

```txt
Frame Diagnostics
→ Runtime Pressure Analysis
→ Budget Evaluation
→ Scaling Decision
→ Runtime Policy Adjustment
→ Render Strategy Update
```

---

# Renderer Strategy Control

Settings should affect:

## Visibility

```txt
LOD bias
visible object limit
occlusion aggressiveness
culling distance
```

---

## Cache Systems

```txt
tile cache size
geometry cache size
texture cache size
render target resolution
```

---

## GPU Upload

```txt
max upload per frame
async upload threshold
streaming priority
```

---

## Camera Runtime

```txt
camera smoothing
motion interpolation
inertia
prediction
```

---

## Worker Runtime

```txt
worker count
async tessellation
background geometry processing
```

---

# Important Separation

## User Setting

User intent.

Example:

```txt
Ultra Quality
```

---

## Runtime Policy

Internal runtime behavior.

Example:

```txt
renderScale = 1.25
shadowResolution = 4096
lodBias = -1
```

---

## GPU State

Backend execution details.

Example:

```txt
WebGPU pipeline state
bind group layout
render target allocation
```

These MUST stay separated.

---

# Final Architectural Goal

The settings system should evolve into:

```txt
Runtime Intelligence Layer
```

The renderer should eventually become:

```txt
Self-adaptive
Budget-aware
Device-aware
Pressure-aware
```

instead of:

```txt
Static rendering pipeline
```

---

# Long-Term Direction

The settings/runtime policy system should eventually support:

- automatic quality scaling
- adaptive visibility
- adaptive streaming
- adaptive cache sizing
- GPU pressure management
- thermal-aware rendering
- battery-aware rendering
- cloud rendering profiles
- scene complexity prediction
- AI-assisted runtime tuning

---

# Final Principle

Modern rendering is NOT:

```txt
“How to render.”
```

Modern rendering IS:

```txt
“How to render within runtime constraints.”
```

The settings system is the policy layer that controls those constraints.