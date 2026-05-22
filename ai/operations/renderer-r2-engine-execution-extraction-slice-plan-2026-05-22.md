# Renderer R2 Engine Execution Extraction Slice Plan (2026-05-22)

Status: Ready
Scope: `ai/refactor-vnext/repo-refactor-management.md` Phase R2 Task 3

[CHANGE REQUEST]

Target:

- File / Module:
  - `packages/engine/src/adapters/backend/canvas2dBackendAdapter.ts`
  - `packages/engine/src/adapters/backend/webglBackendAdapter.ts`
  - `packages/engine/src/adapters/backend/webgpuBackendAdapter.ts`
  - `packages/renderer-canvas2d/src/**`
  - `packages/renderer-webgl/src/**`
  - `packages/renderer-webgpu/src/**`

Goal:

- Problem being solved:
  - 在不迁移 render planning/document/runtime policy 的前提下，把 backend execution 实现从 engine 逐步迁出到 renderer staging 包。

Change Type:

- Plan / Modify（分段迁移计划）

Impact:

- Affected modules:
  - engine backend adapter bridge 层
  - `_vnext` renderer execution 实现层

Cleanup:

- Old logic to remove:
  - engine adapter 内部重复执行实现（在桥接稳定后删除）

Tests:

- Tests to add/update:
  - `pnpm --filter @venus/engine exec node --import tsx --test src/testing/webAdapter.conformance.test.ts`
  - `pnpm --filter @venus/engine exec tsc -p tsconfig.json --noEmit`
  - `pnpm --filter @venus/engine cr:check`
  - `pnpm --filter @venus/vector-editor-web exec tsc -p tsconfig.app.json --noEmit`

## 1. 本轮验证结论

1. 直接使用 engine 源码相对路径桥接到 `_vnext` 源文件会触发 engine tsconfig 编译边界错误（TS6059/TS6307，rootDir/include 限制）。
2. 在恢复 engine 适配器本地实现后，以下门禁均恢复通过：
   - `webAdapter.conformance` 3/3 通过
   - engine tsc 通过
   - engine cr:check 通过
   - vector-editor-web tsc 通过

## 2. 可执行迁移切片（不越界）

1. 保持 engine selector/facade/policy 不变，仅替换 adapter 执行体。
2. 先把执行逻辑在 `_vnext` 包中持续演进并补齐 contract test。
3. 完成包级可解析边界后（workspace + dependency + types）再切换 engine adapter bridge。
4. 切换后删除 engine adapter 旧执行实现，保留 API 兼容壳层。

## 3. 切换前置条件

1. `_vnext` renderer 包需具备可被 engine 以 package import 方式解析的稳定入口。
2. engine 工程配置需允许消费该 package 入口而不违反 rootDir/include 边界。
3. 桥接切换必须附带 adapter conformance 回归与类型门禁全绿。

## 4. 完成判定（Task 3）

1. engine adapter 对 canvas2d/webgl/webgpu 的执行路径由 `_vnext` 包实现提供。
2. engine 仍负责 backend 选择与 facade 暴露，不新增 app 直连 backend 实现路径。
3. 迁移后四条门禁命令持续通过。
