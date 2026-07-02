# Engine Module Constraints

**Date:** 2026-07-02
**Purpose:** Defines the direction, structure, and behavioral rules for the engine module system. All subsequent AI-authored changes must comply with this document.

---

## 1. Direction (方向)

### 1.1 Mission

Engine 是 Venus 的渲染与交互运行时。它提供：

- **文档模型**：shapes (rect/ellipse/line/polygon/path)、text、image、group/clip/mask
- **渲染能力**：Canvas2D 主后端，WebGL 作为大场景可选项
- **交互能力**：camera 控制、hit-test、选择、吸附、动画
- **编辑能力**：undo/redo、视觉效果、导出

### 1.2 Non-Goals

- Engine 不是编辑器——不包含 UI、toolbar、面板
- Engine 不是协作引擎——不包含 OT/CRDT
- Engine 不是文件格式——不包含 .venus 文件解析

### 1.3 Module Philosophy

- **Layer 0 (Infrastructure)**: 内部服务，不暴露给用户，不可 opt-out
- **Layer 1 (Base)**: always-present 基础能力，用户不可 opt-out
- **Layer 2+ (Optional)**: user-installable，按需引入，可 tree-shake

---

## 2. Structure (结构)

### 2.1 Module Names (final)

```
VENUS_MODULE_NAMES = [
  // Layer 1 — always-present runtime capability
  'render',

  // Layer 2+ — user-installable
  'camera',
  'hitTest',
  'interaction',   // merged: select + snap
  'animate',
  'debug',
  'effects',
  'history',
  'export',
]
```

**Removed from original 11:**

- `select` → merged into `interaction`
- `snap` → merged into `interaction`
- `scale` → merged into `render` (LOD/culling are render strategies)
- `viewport` → internal service only; public viewport operations belong to `camera`

### 2.2 Internal Service Names (final)

```
VENUS_INTERNAL_SERVICE_NAMES = [
  'document',
  'viewport',
  'invalidation',
  'spatial',
  'geometryCache',
  'scheduler',
]
```

**Actively registered:** `document`, `viewport`, `invalidation`, `spatial`, `geometryCache`, `scheduler`

Reserved names must not appear in `VENUS_INTERNAL_SERVICE_NAMES` until an actual service is registered and typed in `VenusRegisteredServiceMap`.

### 2.3 Dependency Rules

```
render  ← (no deps)
spatial ← (no deps — pure data structure)
geometryCache ← spatial
scheduler ← (no deps — rAF wrapper)

camera ← viewport service
hitTest ← render + spatial + geometryCache
interaction ← camera + hitTest
animate ← scheduler
history ← document
effects ← render
export ← render + effects
debug ← (no deps)
```

**Rule: Dependencies go downward only. Layer N may depend on Layer N-1, never upward or sideways.**

### 2.4 File Layout

```
packages/engine/src/runtime/venus/modules/
├── catalog.ts              # VENUS_MODULE_NAMES, catalog entries
├── services.ts             # VENUS_INTERNAL_SERVICE_NAMES
├── index.ts                # barrel export
│
├── _infra/                 # Layer 0 — internal services
│   ├── spatial.ts          # RBush spatial index service
│   ├── geometryCache.ts    # Multi-tier geometry cache service
│   └── scheduler.ts        # rAF scheduler service
│
├── render/                 # Layer 1
│   ├── render.ts           # Engine mount, render loop, backend selection
│   └── index.ts
│
├── camera/                 # Layer 2
│   ├── camera.ts           # pan/zoom/fit/project/unproject
│   ├── module.ts           # createVenusCameraModule()
│   └── index.ts
│
├── hitTest/                # Layer 2
│   ├── hitTest.ts
│   ├── module.ts           # createVenusHitTestModule()
│   └── index.ts
│
├── interaction/            # Layer 2 (select + snap merged)
│   ├── interaction.ts
│   ├── module.ts           # createVenusInteractionModule()
│   └── index.ts
│
├── animate/                # Layer 2
│   ├── animate.ts
│   ├── module.ts           # createVenusAnimateModule()
│   └── index.ts
│
├── history/                # Layer 3
│   ├── history.ts
│   ├── module.ts           # createVenusHistoryModule()
│   └── index.ts
│
├── effects/                # Layer 3
│   ├── effects.ts
│   ├── module.ts           # createVenusEffectsModule()
│   └── index.ts
│
├── export/                 # Layer 3
│   ├── export.ts
│   ├── module.ts           # createVenusExportModule()
│   └── index.ts
│
└── debug/                  # Layer 4
    ├── debug.ts
    ├── module.ts           # createVenusDebugModule()
    └── index.ts
```

---

## 3. Behavior (行为约束)

### 3.1 API Injection Pattern

每个可选模块（Layer 2+）必须通过 `defineVenusModule` 包装，安装时返回模块 API。Venus 运行时负责保存返回值，并通过 gate/facade 或后续 typed augmentation 暴露给用户：

```ts
// ✅ 正确：模块定义
const camera = defineVenusModule({
  name: 'camera',
  install({ venus, services }) {
    const viewport = services.require('viewport')
    return {
      zoomTo(scale, anchor) { ... },
      panBy(delta) { ... },
    }
  }
})

// ❌ 错误：直接给 Venus 类加方法
class Venus {
  zoomTo(scale, anchor) { ... }  // 不允许
}
```

**当前规则：**

- `new Venus()` / `createVenus()` 默认不安装任何 Layer 2+ 模块。
- Layer 2+ 模块必须通过 `parameters.modules` 显式传入，并由 `moduleApis` 捕获 `install()` 返回的 API。
- 当前 public facade 方法允许存在于 Venus class 上，但必须在运行时检查模块是否安装；未安装时必须抛出清晰错误。
- 新增 Layer 2+ public API 时，必须先新增模块 factory、模块 API、docs、tests，不允许只在 Venus class 上硬加方法。
- 长期目标仍是把 Layer 2+ 方法从 Venus class 移到 typed module augmentation。

### 3.2 Module Boundary Rule

```
内部模块（Layer 0-1）        外部模块（Layer 2+）
─────────────────────        ─────────────────────
- 不经过 defineVenusModule   - 必须经过 defineVenusModule
- Venus.ts 直接 import        - 通过 parameters.modules 传入
- 不可 opt-out                - 可 opt-out
- 不暴露独立入口              - 有独立入口 @venus/engine/<module>
```

### 3.3 Geometry Cache Tiers

```ts
interface GeometryCacheTiers {
  aabb: Map<NodeId, AABB>; // O(1) lookup, used for culling
  bbox: Map<NodeId, OBB>; // used for rotated hit-test
  path: Map<NodeId, PathData>; // used for precise hit-test
  simplified: Map<NodeId, PathData>; // used for LOD rendering
}
```

**规则：上层查询时声明所需 tier；cache miss 时自动计算并填充该 tier 及所有更低 tier。**

### 3.4 API Completeness Rule

每个公开方法必须有：

- ✅ JSDoc `@name` `@description` `@param` `@example`
- ✅ 类型签名（参数和返回值）
- ✅ engine-docs 条目
- ✅ 集成测试（至少 smoke test）

### 3.5 Test Requirements

- 每个模块必须有独立测试文件：`modules/<name>/<name>.test.ts`
- 必须有模块组合测试：`modules/__tests__/module-combinations.test.ts`
- 必须有模块边界测试：`modules/__tests__/module-boundaries.test.ts`
- 新属性必须有 contract test

### 3.6 Comment Coverage Rule

沿用 `.github/copilot-instructions.md` 的全部规则：

- 每个新函数/修改函数有 leading intent comment
- 每个 type/interface 有声明级注释
- 每个字段有行级注释
- 临时补丁标记 `AI-TEMP:`

### 3.7 Naming Convention

| 概念     | 引擎内部名        | 对外名          |
| -------- | ----------------- | --------------- |
| 视口控制 | `viewport` (服务) | `camera` (模块) |
| 碰撞检测 | `hitTest`         | `hitTest`       |
| 交互编辑 | `interaction`     | `interaction`   |
| LOD/裁剪 | (归入 render)     | `render` params |

---

## 4. Execution Sequence

### Phase 0: Infrastructure (current)

- [x] Register `spatial` service
- [x] Register `geometryCache` service
- [x] Register `scheduler` service
- [x] Update `VenusRegisteredServiceMap` types
- [ ] Expand `geometryCache` beyond AABB into BBOX/PATH/simplified tiers

### Phase 1: Module Restructuring

- [x] Rename `select` + `snap` → `interaction`
- [x] Remove `scale` from module names (logic → render)
- [x] Remove public `viewport` module name (logic → internal service + `camera`)
- [x] Rename module files per new layout
- [x] Implement module API return/capture pattern for Layer 2+
- [x] Gate existing Layer 2+ public facade methods by installed modules
- [ ] Move Layer 2+ methods out of Venus class into typed module augmentation

### Phase 2: Module Implementation

- [x] Implement `interaction` module selection API
- [ ] Add snap logic to `interaction`
- [x] Implement `effects` module facade API
- [x] Implement `export` module image/SVG API
- [ ] Add PDF export if it remains a product requirement

### Phase 3: Quality

- [x] Module combination integration tests
- [x] Module boundary import tests
- [x] engine-docs public method contract update for current module structure
- [ ] New property contract tests for every model/base/common property

---

## 5. Do Not Do (禁止事项)

- ❌ 不要绕过模块 API/gate 直接在 Venus 类上加新的 Layer 2+ public 方法
- ❌ 不要让模块互相依赖（只能依赖下层）
- ❌ 不要创建超过 400 行的单文件模块（拆）
- ❌ 不要跳过测试
- ❌ 不要引入新的内部服务而不注册
- ❌ 不要改 Layer 0 服务的 API 而不更新 VenusRegisteredServiceMap
