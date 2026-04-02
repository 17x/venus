# Venus 编辑器架构

## 总览

当前仓库采用 React + TypeScript + Worker + SharedArrayBuffer 的分层模型，先把高频交互链路跑通，再逐步接入 WebGL / Skia / FlatBuffers。

核心原则：

- 主线程只负责 UI、事件采集、状态展示
- Worker 负责命中检测、历史、索引、解析等重计算任务
- SharedArrayBuffer 负责运行时热数据共享
- FlatBuffers 负责网络和存储层的二进制传输
- 渲染层直接消费共享内存，避免重复对象拷贝

## 分层设计

### 1. 输入层

- 所在位置：`apps/vector-editor-web`
- 职责：捕获鼠标、手势、快捷键、滚轮、拖拽
- 产出：标准化输入事件，例如 `pointermove`、`pointerdown`、`zoom`、`pan`

### 2. 数据层

- 所在位置：`packages/shared-memory`
- 职责：定义 SharedArrayBuffer 布局
- 内容：图元几何数据、状态位、版本号、选中索引、hover 索引
- 特点：适合高频读写和批量扫描

### 3. 计算层

- 所在位置：`packages/editor-worker`
- 职责：
  - 粗筛与精滤命中检测
  - 空间索引查询
  - 复杂几何运算
  - 历史记录 patch 生成
  - 文件解析与二进制转换
  - 协作 diff 合并

### 4. 渲染层

- 所在位置：`packages/renderer-skia`、后续 `packages/renderer-webgl`
- 当前阶段：React 中的可视化占位 Stage
- 未来目标：
  - OffscreenCanvas + WebGL 做高频绘制
  - CanvasKit / Skia 负责复杂路径、文字、布尔运算相关渲染

### 5. 持久化与同步层

- 服务器：二进制文档、协作状态、资源文件
- IndexedDB：本地缓存、离线快照
- FlatBuffers：网络和存储层的二进制协议

## 数据流

### 交互链路

1. 主线程捕获 pointer 坐标
2. 主线程把输入发给 Worker
3. Worker 在 SAB 中做粗筛和精滤
4. Worker 更新 hover / selected 状态位
5. 渲染层直接读取 SAB，刷新界面

### 加载链路

1. 服务器或 IndexedDB 返回 FlatBuffers Buffer
2. Worker 解析二进制数据
3. Worker 构建图元表、空间索引、渲染缓存
4. Worker 写入 SharedArrayBuffer
5. 渲染层读取最新共享数据

### 编辑链路

1. 主线程发送命令，如“移动图元”“修改颜色”
2. Worker 修改 SAB 中对应字段
3. Worker 记录 history patch
4. 渲染层按最新版本号重绘

## 为什么拆成这样

- FlatBuffers 解决传输和解析开销
- SharedArrayBuffer 解决主线程和 Worker 间的热数据共享
- Worker 解决高频命中检测和复杂计算
- Skia / WebGL 解决大规模图形绘制性能

## 目标目录树

```text
apps/
  vector-editor-web/
  editor-desktop/

packages/
  canvas-base/
  document-core/
  editor-worker/
  file-format/
  renderer-skia/

  ui/
    base/
    editor/
```

说明：

- `canvas-base`：负责运行时生命周期、viewport、worker 桥接、共享场景快照订阅
- `document-core`：只保留文档模型、领域类型、稳定协议，不承载产品默认值
- `editor-worker`：负责命令执行、命中检测、patch 生成、协作与索引维护
- `file-format`：负责持久化格式、导入导出、版本迁移
- `renderer-skia`：Skia / CanvasKit 渲染适配器
- `ui/base`：按钮、面板、tooltip、布局等基础组件
- `ui/editor`：编辑器壳层、菜单、面板骨架、viewport 组合层

不再作为长期顶层 package 目标的模块：

- `collaboration`：并入 `editor-worker`
- `history`：并入 `editor-worker`
- `spatial-index`：若没有第二实现，优先并入 `editor-worker`
- `shared-memory`：优先并入 `canvas-base`

仅作为规划占位、尚未形成稳定边界的目录，建议移除或下沉到文档中管理：

- `core`
- `document-model`
- `geometry`
- `input`
- `math`
- `render-pipeline`
- `renderer-canvas`
- `shared`
- `text`

## 当前最小可运行骨架

当前仓库已经实现了一条最小闭环：

- `React` 负责界面
- `Worker` 负责命中检测
- `SharedArrayBuffer` 负责共享图元状态
- `renderer-skia` 负责展示共享内存中的形状状态

这条链路的目标不是“功能完整”，而是先验证：

`pointer event -> worker hit test -> update SAB -> stage redraw`

## 迁移顺序

### 第一阶段：先收拢边界

1. 将 `packages/collaboration` 合并到 `packages/editor-worker`
2. 将 `packages/history` 合并到 `packages/editor-worker`
3. 若确认不会替换实现，将 `packages/spatial-index` 合并到 `packages/editor-worker`
4. 将 `packages/shared-memory` 合并到 `packages/canvas-base`

目标：

- 减少横向 package 跳转
- 让 worker 相关状态和算法回到同一处维护
- 让共享内存布局回到 runtime 基础设施层

### 第二阶段：重组 UI 分层

1. 将 `packages/ui` 重命名或迁移为 `packages/ui/base`
2. 先将 vector editor 专属 UI 收回 `apps/vector-editor-web`
3. 只有在出现第二个消费者时，再考虑抽出 `packages/ui/editor`

应当移回 app 的内容包括：

- `createStarterDocument` 一类 starter/demo 默认值
- vector editor 专属 toolbar、panel 组合
- demo 型的插入矩形、默认侧栏内容

目标：

- `ui/base` 只承载基础组件
- `ui/editor` 只承载编辑器壳层
- app 层负责具体产品行为

### 第三阶段：收紧领域边界

1. 让 `document-core` 只保留文档模型、领域类型、稳定 contract
2. 将工具注册、产品快捷键、产品默认面板配置移出 `document-core`
3. 为 `file-format` 补足 schema、迁移策略、格式边界

目标：

- `document-core` 不再混入产品装配逻辑
- 多编辑器产品可以共享领域层，但各自保留 UI 和工具配置

### 第四阶段：删除占位目录

移除当前没有稳定代码和 package 定义的占位目录，避免误导后续拆分：

- `core`
- `document-model`
- `geometry`
- `input`
- `math`
- `render-pipeline`
- `renderer-canvas`
- `shared`
- `text`

## 近期实现建议

1. 在 `canvas-base` 中继续扩展场景快照字段，例如颜色、transform、zIndex、visibility
2. 在 `editor-worker` 中继续沉淀命中检测、patch 生成、索引维护
3. 让 `renderer-skia` 继续承担渲染后端适配职责，后续按需要补 `renderer-webgl`
4. 为加载与保存补充 `file-format` schema 与迁移链路
