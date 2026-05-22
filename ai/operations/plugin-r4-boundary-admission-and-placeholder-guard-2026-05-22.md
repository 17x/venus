# Plugin R4 Boundary Admission and Placeholder Guard (2026-05-22)

[CHANGE REQUEST]

Target:

- File / Module:
  - `ai/refactor-vnext/repo-refactor-management.md`
  - `ai/operations/plugin-r4-boundary-admission-and-placeholder-guard-2026-05-22.md`

Goal:

- Problem being solved:
  - 完成 R4 第三和第四项：建立产品能力拆分到 app/plugin 的准入口径，并固化“禁止领域占位插件”的执行证据。

Change Type:

- Add / Modify

Impact:

- Affected modules:
  - R4 任务治理与拆分准入规则文档

Cleanup:

- Old logic to remove:
  - 无

Tests:

- Tests to add/update:
  - static scan: `_vnext` 下 plugin 包清单
  - static scan: app 侧是否存在领域插件占位导入
  - `pnpm --filter @venus/engine cr:check`
  - `pnpm --filter @venus/vector-editor-web exec tsc -p tsconfig.app.json --noEmit`

## 1. App vs Plugin 拆分准入规则

1. 归属 app：
   - 与产品 UI、流程、交互策略强绑定。
   - 依赖产品状态模型或页面路由结构。
   - 尚未具备稳定 runtime contract 输入/输出边界。
2. 归属 plugin：
   - 功能可在多个 app 复用且不依赖 app 私有状态。
   - 生命周期可通过标准 hook（setup/activate/deactivate/dispose）表达。
   - 输入输出契约可落在 runtime/engine 公共合同，不依赖私有路径。
3. 迁移前置门槛（必须同时满足）：
   - 已存在稳定 lifecycle contract（当前为 `plugin-lifecycle`）。
   - 已有 conformance test 覆盖生命周期顺序与 disposal 终态。
   - 不引入 `@venus/engine/src/*` 或其他私有路径依赖。

## 2. 当前决策表（2026-05-22）

1. 保留在 app：`apps/vector-editor-web` 的产品 UI/状态编排能力（运行时边界仍在稳定中）。
2. 允许独立为 plugin 合同层：`packages/plugin-lifecycle`（通用生命周期合同，不承载领域策略）。
3. 暂不创建：`plugin-medical`、`plugin-gis`、`plugin-cad`、`plugin-video` 等领域插件包。

## 3. 占位插件防护结论

1. `_vnext` 当前仅存在 `plugin-lifecycle`，未创建领域占位插件目录。
2. 领域插件仍保持“延后创建”策略，需在 runtime 边界稳定后按准入规则逐项创建。

## 4. 完成判定（R4-3 / R4-4）

1. 已定义并文档化 app/plugin 拆分准入规则。
2. 已确认无领域占位插件目录落地。
3. 清单已回写并附证据链接。
