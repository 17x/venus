# Documentation Index

Welcome to the Venus documentation.


### 

#### 输入（SAB）、计算（Worker）、渲染（WebGL/Offscreen） 产出（Blob Export）

- 输入层 (Main Thread)：捕获鼠标/手势坐标。
- 数据层 (SharedArrayBuffer)：存放所有图形的二进制属性。
  - 计算层 (Worker)：
      执行 粗筛 找到候选图形。

      执行 精滤 确定选中物体。

      更新 SAB 中的状态位（如 isSelected）。
      空间索引构建与查询：当你有上万个矢量元素，构建 R-Tree 或进行复杂的碰撞检测时。

      复杂的几何运算：比如布尔运算（两个图形相交、相减）、复杂的路径简化算法（Douglas-Peucker）。
    
      文件解析与编码：解析大型 SVG/PDF，或者执行 convertToBlob 之前的数据预处理。
    
      协作同步逻辑 (CRDT)：在高频多人协作时，合并来自服务器的二进制 Diff 数据。

- 渲染层 (Same Worker 或 Parallel Worker)：
    直接从 SAB 读取最新数据。

通过 OffscreenCanvas 驱动 WebGL 绘制，实现 60fps 的丝滑缩放和平移。

- 数据加载
  - 存储
    - 服务器
    - IndexDB
    - 
- 解析数据
  - 逻辑层
  - 渲染层
  - 
  - SAB创建
  - WebGL渲染
  - Rtree
  - Skia(Web Assembly)
  - Web Worker
    - 修改SAB下标
    - 历史记录处理
    - 向WebGL传输渲染数据
  - 
- history
  - 向Web Worker传输ID和变量

  - FlatBuffers

A. 数据流转 (The Data Pipeline)
数据源：服务器下发 FlatBuffers 二进制流。

逻辑层 (Worker)：Worker 接收 Buffer。利用 FlatBuffers 的 JS 访问器读取图形属性。

渲染准备：Worker 将需要渲染的坐标和颜色提取出来，存入 SharedArrayBuffer (SAB)。

渲染层 (Skia/Wasm)：Skia 所在的线程直接从 SAB 读取数据，并在 OffscreenCanvas 上进行绘制。

B. 为什么这么快？
FlatBuffers 解决了“数据解析”的耗时。

Skia (Wasm) 解决了“复杂图形（如布尔运算、贝塞尔精修）”的渲染性能，比原生 Canvas 2D API 快得多且功能更全（支持 Lottie、复杂的混合模式）。

4. 深度交互细节：内存同步 (Pointer Sharing)

总结
FlatBuffers <-> JS：通过 偏移量引用 交互（极速数据读取）。

Skia <-> JS：通过 Wasm 接口 & 内存共享 交互（极致图形渲染）。
