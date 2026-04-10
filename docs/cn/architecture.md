# Venus 编辑器架构

## 总览

当前 Venus 采用“UI 壳层 + 运行时基础设施 + Worker 计算 + SAB 热数据 + Skia 渲染”的分层架构，重点先保证大场景下的可用性能与边界清晰。

当前主链路已经跑通：

`apps/vector-editor-web` / `apps/runtime-playground`
-> `@venus/runtime` + `@venus/runtime-interaction` + `@venus/runtime-react`
-> `@venus/editor-worker` + `@venus/shared-memory`
-> `@venus/renderer-skia`

## 设计原则

- React 负责产品 UI 与编排，不承载高频运行时状态
- Worker 负责命令执行、命中检测、历史与索引
- SharedArrayBuffer 作为运行时热数据通道
- 渲染层直接消费快照与 viewport
- 文件格式与运行时模型解耦，便于多编辑器演进

## 包职责

### `@venus/document-core`

- 文档模型与基础类型
- 几何工具、单位、工具类型等通用能力

### `@venus/runtime`

- 运行时 controller（启动、订阅、命令桥接）
- viewport 状态与矩阵变换
- gesture 输入绑定（wheel / gesture / pointer）

### `@venus/runtime-interaction`

- 选择框、多选、拖拽、吸附、变换等交互算法
- 保持 framework-agnostic，不放产品 UI

### `@venus/runtime-react`

- React 适配层（`useCanvasRuntime`、`CanvasViewport`）
- overlay / renderer React 契约

### `@venus/editor-worker`

- Worker 协议处理
- 命令执行（insert / move / resize / reorder / delete 等）
- 命中检测
- 历史状态
- 协作状态占位

### `@venus/shared-memory`

- SAB 内存布局
- 几何、类型、标记位读写
- 统计信息读写（version / hovered / selected 等）

### `@venus/renderer-skia`

- CanvasKit 初始化与 surface 管理
- 可见区域裁剪与 tile 渲染
- tile cache / 预热
- 交互态 LOD
- 渲染诊断与慢帧日志

### `@venus/file-format`

- schema 与迁移
- 运行时场景解析适配（JSON -> runtime scene -> editor document）

## 应用层角色

### `apps/vector-editor-web`

- 产品 UI（菜单、工具栏、面板）
- `useEditorRuntime` 作为 app 编排入口
- 文件导入导出与业务动作映射

### `apps/runtime-playground`

- 运行时验证与压力测试
- 提供 `10k / 50k / 100k / 1000k` 场景按钮
- 展示 renderer cache 与耗时指标

## 数据流

### 命令流

1. UI 触发动作（toolbar/menu/shortcut）
2. `runtime` 层发送 command 给 worker
3. worker 修改文档与 SAB
4. 主线程接收 scene 更新并通知订阅者
5. renderer 按最新快照绘制

### 指针流

1. `CanvasViewport` 捕获 pointer
2. `gesture` 模块做输入编排
3. pointer 事件发给 worker 命中检测
4. worker 更新 hover/selection 标记
5. renderer 仅重绘必要状态

### 缩放/平移流

1. wheel / gesture 输入进入 `gesture` 模块
2. `zoom` 模块区分 mouse 与 touchpad
3. viewport 状态更新
4. renderer 根据 viewport 计算可见 tile 并绘制

## 当前性能策略

- 空间索引：worker 命中检测使用 spatial index
- Scene 更新：支持 `full` 与 `flags` 更新路径
- 渲染分块：tile-based cache + overlay 分层
- 预热策略：仅大场景启用预热，减少空场景初始化开销
- 诊断日志：
  - `CANVAS-BASE slow message handler`
  - `CANVAS-BASE slow snapshot apply`
  - `CANVAS-BASE slow viewport render`
  - `[renderer-skia] slow frame`

## 当前已知瓶颈

- 超大场景下首帧或首交互可能出现慢帧
- 低缩放大可视区域时，tile 数量可能快速增大
- React 壳层订阅与 renderer 重绘仍需继续切分

## 下一步方向

1. 继续减少初始化阶段重复绘制触发
2. 进一步收敛 `CanvasViewport`（保持 React adapter 职责）
3. 细化 zoom/pan 设备策略（mouse 与 touchpad 分治）
4. 逐步推进 `document-core` 向通用 `Node + Features` 语义演进
