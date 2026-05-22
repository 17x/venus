# Platform R3 Browser API Boundary Status (2026-05-22)

[CHANGE REQUEST]

Target:

- File / Module:
  - `packages/engine/src/runtime/engineRuntime.ts`
  - `packages/engine/src/scheduler/renderScheduler.ts`
  - `packages/engine/src/adapters/backend/webgpuBackendAdapter.ts`
  - `ai/refactor-vnext/repo-refactor-management.md`

Goal:

- Problem being solved:
  - 固化 R3 第三项当前状态：识别并记录 engine 中仍存在的浏览器全局 API 依赖，避免误判为已完成。

Change Type:

- Add / Modify

Impact:

- Affected modules:
  - R3 checklist execution evidence

Cleanup:

- Old logic to remove:
  - 无

Tests:

- Tests to add/update:
  - static scan: browser global usage in `packages/engine/src`

## Status

1. R3 task 3（Keep browser APIs outside engine package after cutover）目前未完成。
2. 主要阻塞点：engine 仍存在浏览器全局 API 使用。

## Blocking Evidence

1. `packages/engine/src/runtime/engineRuntime.ts`
   - `globalThis.requestAnimationFrame`
   - `globalThis.cancelAnimationFrame`
2. `packages/engine/src/scheduler/renderScheduler.ts`
   - fallback `requestAnimationFrame`
   - fallback `cancelAnimationFrame`
3. `packages/engine/src/adapters/backend/webgpuBackendAdapter.ts`
   - `navigator` probe (`navigator.gpu`)

## Next Extraction Direction

1. 将 frame scheduler 与 backend capability probe 收敛到 `platform-browser` / `platform-node` staging adapters。
2. engine 保留注入点，不直接依赖浏览器全局 API。
3. 完成迁移后复跑静态扫描，确认 engine 包零 browser global 依赖。
