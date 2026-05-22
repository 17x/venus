# Renderer R2 Facade Preservation Validation (2026-05-22)

[CHANGE REQUEST]

Target:

- File / Module:
  - `ai/refactor-vnext/repo-refactor-management.md`
  - `apps/**` import scan evidence

Goal:

- Problem being solved:
  - 验证并固化 R2 第四项：应用层不直接选择 backend 实现细节，统一通过 engine facade 访问。

Change Type:

- Add / Modify

Impact:

- Affected modules:
  - R2 checklist governance evidence

Cleanup:

- Old logic to remove:
  - 无

Tests:

- Tests to add/update:
  - import path static scan（apps 范围）
  - `pnpm --filter @venus/engine cr:check`
  - `pnpm --filter @venus/vector-editor-web exec tsc -p tsconfig.app.json --noEmit`

## Validation Evidence

1. `apps/*` 中未发现对以下实现细节路径的直接依赖：
   - `@venus/engine/src`
   - `packages/engine/src`
   - `renderer-canvas2d` / `renderer-webgl` / `renderer-webgpu`
   - `backendAdapterRegistry` / `backendSelector`
2. `apps/*` 中存在的 engine 依赖为 `@venus/engine` facade 导入（符合预期）。
3. `apps/vector-editor-web/tsconfig.app.json` 目前通过路径映射解析 `@venus/engine` 到 engine index（开发态入口），不暴露 backend 内部实现路径。
