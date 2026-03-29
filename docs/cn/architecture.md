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

## 推荐目录树

```text
apps/
  vector-editor-web/
  editor-desktop/

packages/
  editor-core/
  editor-ui/
  editor-worker/
  shared-memory/
  renderer-skia/
  renderer-webgl/
  geometry/
  spatial-index/
  history/
  collaboration/
  file-format/
```

## 当前最小可运行骨架

当前仓库已经实现了一条最小闭环：

- `React` 负责界面
- `Worker` 负责命中检测
- `SharedArrayBuffer` 负责共享图元状态
- `renderer-skia` 负责展示共享内存中的形状状态

这条链路的目标不是“功能完整”，而是先验证：

`pointer event -> worker hit test -> update SAB -> stage redraw`

## 下一步建议

1. 在 `shared-memory` 中扩展颜色、transform、zIndex、visibility 等字段
2. 在 `editor-worker` 中引入空间索引
3. 新增 `renderer-webgl` 或让 `renderer-skia` 接入 CanvasKit
4. 把 history patch 从 UI 层完全移到 Worker
5. 为加载与保存增加 FlatBuffers schema
