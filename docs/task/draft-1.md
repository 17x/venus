# 基于现有渲染 Engine 的编辑器渲染架构改造方案

## 背景

当前项目已经有一个负责渲染的 engine。

这个 engine：

- 已经承担实际绘制职责
- 没有明显的语义化层级设计
- 已经做过不少性能优化
- 不适合被推翻重写

因此，这份方案的目标不是重做 renderer，也不是把现有 engine 改造成一个全新的图层系统。

目标是：

- 保留现有 engine 的渲染优势
- 不破坏已有性能优化
- 在 engine 之上增加更清晰的编辑器渲染组织方式
- 把业务语义从底层渲染执行中拆开
- 让 AI 可以在现有架构上继续细化和实施

---

## 设计目标

这次设计要解决的不是“怎么从零做 renderer”，而是“如何在已有高性能 engine 基础上，加一层适合编辑器的渲染组织结构”。

核心目标如下：

1. 继续让现有 engine 负责实际绘制
2. 不强行把 engine 改造成带业务语义的系统
3. 在 engine 上层增加一层 render preparation / render orchestration
4. 把 selection / handles / guides / preview / picking 这类编辑器语义从 engine 内部抽离
5. 支持 50K+ 元素下的增量更新，而不是每次全量重建和全量上传
6. 支持更合理的 hit test / multi-hit / cursor 控制链路

---

## 核心判断

### 1. 现有 engine 仍然是最终执行绘制的地方

这次方案不是绕开 engine，也不是让上层直接操作 WebGL。

最终仍然是：

- 上层准备渲染数据
- 现有 engine 接收这些数据
- engine 内部继续执行 buffer 更新、状态切换、batch、draw call、真正绘制

也就是说：

**最终还是画到现有 engine 里。**

区别只是：

**engine 不再直接承担过多业务语义，而是尽量只承担“如何高效画出来”。**

---

### 2. 不要求 engine 原生支持“selection / guides / preview / cursor”这些语义

这些词本质上是编辑器语义，不是底层渲染基础能力。

因此不建议把现有 engine 改成这种接口：

```ts
engine.drawSelection(...)
engine.drawHandles(...)
engine.drawGuides(...)
engine.drawPreview(...)
engine.setCursor(...)
```

这会让 engine 和业务交互语义强耦合。

更合理的方向是：

- engine 继续吃通用渲染数据
- 上层把 selection / handles / guides / preview 转成可绘制的数据结构
- 上层根据 hit test 结果控制 cursor
- engine 只负责把这些数据高效画出来

也就是说：

**engine 负责 how to draw，上层负责 what to draw，interaction layer 负责 how to interact。**

---

### 3. 关键不是避免 redraw，而是降低 redraw 代价

在编辑器里：

- pointer move
- hover
- selection
- drag preview
- zoom / pan

这些交互发生时，重绘本来就是正常的。

真正的问题不是“会不会重绘”，而是：

- 是否每次都全量 rebuild 50K render items
- 是否每次都全量上传 50K instance 数据
- 是否把静态场景和高频 overlay 混在一起
- 是否无法只更新局部 buffer range

所以优化方向应该是：

- 场景拆层
- buffer 分层
- 增量更新
- dirty 标记
- pass 分离
- hit test 与渲染职责分离

---

## 推荐的新分层：保留 engine，新增上层渲染准备层

推荐在现有架构中加入下面这一层：

```txt
Document Model / Editor State
        ↓
Render Preparation Layer
        ↓
Existing Render Engine
        ↓
WebGL / WebGPU / Canvas Backend
```

如果把交互一起纳入，更完整的链路建议是：

```txt
Document Model / Editor State
        ↓
Render Preparation Layer
        ↓
Existing Render Engine
        ↓
WebGL

Pointer / Keyboard Input
        ↓
HitTest / Interaction Layer
        ↓
Cursor / Tool / Selection Logic
```

这里最关键的是 `Render Preparation Layer` 和 `HitTest / Interaction Layer`。

---

## 推荐的职责划分

### 1. Document Model / Editor State

负责：

- 文档节点
- 图层树或节点树
- 选中状态
- hover 状态
- 工具状态
- guides 业务结果
- preview 业务结果
- 相机 / 视口状态

这一层表达的是产品语义，不直接面向 GPU。

---

### 2. Render Preparation Layer

负责：

- 把业务节点转换成 engine 可消费的数据
- 维护 scene / overlay / picking 的渲染组织
- 输出 batch / instance / uniform / dirty update 描述
- 进行增量更新判断
- 组织每一帧要交给 engine 的 render frame

这一层是这次改造的核心。

它不应该直接依赖某个具体工具逻辑，但可以理解编辑器级别的渲染语义。

---

### 3. Existing Render Engine

继续负责：

- geometry / buffer 管理
- instance 数据上传
- batch 管理
- pipeline / shader / material 状态管理
- draw call 提交
- picking pass 支持
- offscreen / FBO / render target 管理
- 实际绘制执行

engine 不需要知道：

- 当前为什么出现 selection
- 当前 guide 是谁算出来的
- preview 是拖拽复制还是 resize 预览
- 某个 handle 属于什么业务工具
- 当前 cursor 应该是什么

它只需要知道：

- 当前要画哪些 batch
- 哪些 buffer 变了
- 哪些 range 需要更新
- 哪些 pass 要跑

---

### 4. HitTest / Interaction Layer

负责：

- pointer 坐标转换
- overlay 与 scene 的命中测试
- multi-hit 候选收集
- 命中优先级与深度排序
- cursor 解析
- click / drag / cycle selection 的交互决策

这一层不负责实际绘制，但负责把命中结果解释成编辑器交互语义。

---

## 推荐的数据组织方式

建议把送入 engine 的数据组织为：

```ts
type RenderFrame = {
  scene: PassData;
  overlay: PassData;
  picking?: PassData;
};
```

其中 `PassData` 可以是：

```ts
type PassData = {
  batches: RenderBatch[];
  instanceUpdates?: BufferRangeUpdate[];
  uniformUpdates?: UniformUpdate[];
  dirty?: boolean;
};
```

这里的核心思想是：

- engine 吃的是通用渲染数据
- 不直接吃 selection / guide / preview 的业务对象

---

## 推荐的三类 Pass

### 1. Scene Pass

负责真正文档内容。

例如：

- rect
- ellipse
- image
- text frame
- line
- path

特点：

- 数据量最大
- 变化相对较少
- 应优先复用现有 engine 已经做好的优化
- 应避免高频全量重建

---

### 2. Overlay Pass

负责编辑器高频交互视觉。

例如：

- selection bounds
- resize handles
- rotate handle
- hover outline
- marquee
- guides
- preview

注意：

这里虽然在架构上叫 overlay pass，但不意味着 engine 必须有原生 `overlay` 概念。

可以只是 Render Preparation Layer 给 engine 送入的一组单独 batch / draw group。

特点：

- 数据量通常远小于 scene
- 变化更频繁
- 可以接受更轻量的动态重建
- 不应与 scene buffer 强绑定

---

### 3. Picking Pass

负责命中测试支持。

例如：

- scene object picking
- handle picking
- selected node sub-part picking

特点：

- 不以视觉展示为目标
- 只以稳定识别 object id / handle id 为目标
- 应尽量复用 scene / overlay 的几何和实例信息
- 用不同 shader / output 或不同 target 完成 picking

---

## 不建议直接写死的业务接口

以下接口不建议出现在 engine core：

```ts
engine.drawSelection(...)
engine.drawHandles(...)
engine.drawGuides(...)
engine.drawPreview(...)
engine.drawHover(...)
engine.setCursor(...)
```

原因：

- 业务语义太重
- 通用性差
- 后续会严重限制 engine 复用范围
- 容易把交互规则、工具状态机、渲染执行混在一起

更建议通过统一的 render frame / pass data 输入，让上层决定“画什么”，让 engine 决定“怎么画”。

---

## 50K+ 元素场景下的关键策略

### 1. Scene 与 Overlay 分离

不要把：

- 文档元素
- selection
- handles
- guides
- preview

都塞进同一批 scene 数据里。

更合理的是：

- scene 稳定
- overlay 高频变化
- 两者单独组织

这样在 pointer move / hover / drag 时，不会无意义地污染主场景数据。

---

### 2. Geometry 与 Instance 分离

对于规则图元，应尽量复用 primitive geometry。

例如矩形只保留一个 unit quad，然后每个对象只存：

- tx / ty
- width / height
- rotation
- color
- z / flags

这样 50K 元素下就不必为每个对象重复上传完整顶点。

如果 engine 目前已经有类似优化，这次方案应直接复用，而不是推翻。

---

### 3. Static 与 Dynamic 分离

建议至少区分：

- 主场景静态数据
- 主场景可变实例数据
- 高频 overlay 数据
- picking 数据

这样可以避免：

- hover 一下就重建全部 scene
- 选中变化时重传所有主内容实例
- preview 和正式文档状态混在一起

---

### 4. Partial Update / Range Update

50K+ 元素下，不能默认每次都全量上传。

应优先支持：

- 单对象 instance update
- 指定 range buffer update
- overlay 小范围重建
- uniform 局部更新

例如拖动一个元素时，更合理的是：

- 更新该元素对应 instance slot
- 更新 selection / preview overlay
- scene 其余数据保持不动

而不是：

- rebuild 全量 scene items
- 全量重传所有实例数据

---

### 5. Dirty 标记系统

建议增加 dirty 状态管理：

```ts
type RenderDirtyState = {
  sceneInstanceIds: Set<string>;
  overlayDirty: boolean;
  pickingDirty: boolean;
  cameraDirty: boolean;
};
```

用途：

- 判断是否需要重建某类 batch
- 判断是否只需要更新部分 instance range
- 判断是否只需要改 uniform / camera
- 控制每一帧最小更新范围

---

## 推荐的 Buffer 分层思路

### 1. Scene Buffers

建议内部至少区分：

- geometry buffers
- instance buffers
- optional material / style buffers

按图元类型可进一步拆分：

- rect batch
- image batch
- line batch
- ellipse batch
- path batch

如果 engine 已经按材质或管线分批，则应尽量贴合现有实现，而不是机械套模板。

关键点不是形式，而是：

- 支持复用 geometry
- 支持实例化或接近实例化的数据组织
- 支持 partial update

---

### 2. Overlay Buffers

overlay 数据量通常不大，但更新频繁。

建议独立于 scene。

可包含：

- selection lines / bounds
- handles
- hover outline
- marquee
- guides
- preview

如果 overlay 数量始终较小，可以接受较简单的 rebuild 策略。

重点是：

- 不影响 scene 主 buffer
- 与主文档数据解耦
- 便于高频刷新

---

### 3. Picking Buffers / Picking Pass Data

推荐独立管理。

可以考虑：

- 复用 scene / overlay 的几何与实例布局
- 只切换 picking shader / output target
- 仅对可交互对象生成 picking 数据

不要让 picking 逻辑与主显示逻辑完全耦死。

---

## 推荐的增量流程

### 场景 A：hover 一个元素

理想流程：

1. 业务层更新 hovered id
2. Render Preparation Layer 只重建 overlay hover 数据
3. engine 只更新 overlay 相关 buffer
4. 重新绘制 frame

不应发生：

- 全量重建 50K scene items
- 全量上传所有 scene 实例数据

---

### 场景 B：拖动一个元素

理想流程：

1. 更新该元素 transform 或 preview state
2. 标记该元素对应 instance dirty
3. 更新 selection / preview overlay
4. engine 执行 instance range update
5. 重新绘制 frame

不应发生：

- rebuild 全量 scene
- 重传所有对象数据

---

### 场景 C：框选 / guides 变化

理想流程：

1. 更新 marquee / guides 业务状态
2. 只更新 overlay pass data
3. scene 数据保持不动
4. engine 绘制新 frame

---

### 场景 D：zoom / pan

理想流程：

1. 更新 camera / viewport uniform
2. 不改 scene instance 数据
3. engine 直接重画 frame

这种情况下通常要 redraw，但不应该需要重传大量对象数据。

---

## Cursor 控制建议

cursor 的变化不应由 render engine 直接负责。

推荐链路：

```txt
pointermove
-> hit test
-> resolve cursor token
-> canvas.style.cursor = ...
```

也就是说：

- engine 提供命中支持
- interaction layer 解释命中结果
- DOM canvas 承担最终 cursor 呈现

### 推荐的 cursor 解析结果

```ts
type CursorToken =
  | "default"
  | "move"
  | "crosshair"
  | "text"
  | "grab"
  | "grabbing"
  | "ew-resize"
  | "ns-resize"
  | "nwse-resize"
  | "nesw-resize";
```

### 推荐的 cursor 解析职责

- handle -> resize cursor
- border -> edge resize cursor
- rotate handle -> grab / rotate-like cursor
- node body -> move
- empty -> default

### 旋转对象的 handle cursor

建议分两阶段：

1. 初期可按本地方向映射 cursor
2. 后续可按屏幕方向动态映射 cursor

即便后续升级为旋转感知 cursor，也仍然应放在 interaction layer，而不是 engine core。

---

## Multi-hit HitTest / 穿透命中设计补充

当前设计里，如果 hit test 只返回一个目标，那么只能满足：

- 普通 hover
- 普通 click
- cursor 更新
- 顶层命中

但这不足以支持更复杂的编辑器交互，例如：

- 重叠元素穿透选择
- alt / shortcut 循环选择
- 命中列表面板
- 右键显示“当前位置下的所有对象”
- 命中 handle，但仍然想知道下面还有哪些 scene object
- path segment / anchor / node body 的多候选选择

因此，建议把 hit test 能力从“单命中”升级为“多命中列表”。

---

### 设计目标

multi-hit 设计需要满足：

1. 支持 top-most hit
2. 支持 all hits
3. 支持 overlay 与 scene 同时参与命中
4. 支持按优先级与深度排序
5. 支持后续的循环选择、穿透选择、命中菜单
6. 不要求 renderer core 直接承担业务选择逻辑

---

## 不再推荐的单目标接口

不推荐继续把命中能力设计成：

```ts
hitTest(point) => HitTarget | null
```

因为这种设计会天然限制：

- 只能拿到一个命中目标
- 无法表达重叠候选
- 无法做循环选择
- 无法做“上层命中”和“下层命中”并存
- 无法把 cursor、click、穿透选择拆成不同策略

---

## 推荐的命中结果结构

建议改成下面这种形式：

```ts
type HitTestResult = {
  point: Point;
  hits: HitTarget[];
};
```

其中 `hits` 是一个有序列表。

列表中的第一个通常表示最优先响应的目标，但不代表只存在这一个目标。

---

## 推荐的 HitTarget 结构

建议命中结果至少携带：

- kind：命中目标类型
- nodeId / id：对象标识
- priority：交互优先级
- depth：视觉堆叠顺序
- part 信息：例如哪个 handle、哪条边、哪个 segment

参考结构：

```ts
type HitTarget =
  | {
      kind: "handle";
      id: string;
      nodeId: string;
      handle: ResizeHandle;
      priority: number;
      depth: number;
    }
  | {
      kind: "selection-border";
      id: string;
      nodeId: string;
      edge: BorderEdge;
      priority: number;
      depth: number;
    }
  | {
      kind: "rotate-handle";
      id: string;
      nodeId: string;
      priority: number;
      depth: number;
    }
  | {
      kind: "marquee-border";
      id: string;
      edge: BorderEdge;
      priority: number;
      depth: number;
    }
  | {
      kind: "node";
      id: string;
      nodeId: string;
      priority: number;
      depth: number;
    }
  | {
      kind: "path-segment";
      id: string;
      nodeId: string;
      segmentIndex: number;
      priority: number;
      depth: number;
    };
```

AI 后续可以根据项目实际类型系统补充更多 kind。

---

## priority 与 depth 的区别

命中排序不应只看 zIndex 或视觉顺序。

需要同时区分：

### 1. priority

表示交互优先级。

例如：

- handle 通常应该优先于 node body
- selection border 应优先于下层普通元素
- rotate handle 应优先于 selection frame
- guide 通常不应该抢普通点击目标

### 2. depth

表示视觉上的上下层顺序。

例如：

- 最上面的对象 depth 更高
- 更靠下的对象 depth 更低

推荐排序方式：

1. 先按 priority 排序
2. 再按 depth 排序
3. 最后再按局部规则或稳定顺序排序

---

## 推荐的命中 API

建议拆成两类能力：

### 1. top-most hit

给高频交互使用，例如：

- cursor
- hover
- 普通 click

接口示意：

```ts
hitTestTop(point, options) => HitTarget | null
```

### 2. all hits

给高级交互使用，例如：

- 穿透选择
- 重叠对象列表
- 循环选择
- 调试

接口示意：

```ts
hitTestAll(point, options) => HitTarget[]
```

如果希望统一成一个接口，也可以：

```ts
hitTest(point, options) => HitTestResult
```

然后由 `options.mode` 决定返回 top 还是 all。

---

## 推荐的 HitTestOptions

建议增加命中选项，避免把所有场景都绑成一个固定策略。

例如：

```ts
type HitTestOptions = {
  mode?: "top" | "all";
  includeOverlay?: boolean;
  includeScene?: boolean;
  includeLocked?: boolean;
  includeHidden?: boolean;
  kinds?: HitKind[];
};
```

使用示例：

### cursor / hover

```ts
hitTest(point, {
  mode: "top",
  includeOverlay: true,
  includeScene: true,
  includeLocked: false,
});
```

### 穿透 scene 选择

```ts
hitTest(point, {
  mode: "all",
  includeOverlay: false,
  includeScene: true,
  includeLocked: false,
});
```

### 调试命中列表

```ts
hitTest(point, {
  mode: "all",
  includeOverlay: true,
  includeScene: true,
  includeLocked: true,
});
```

---

## 推荐的命中顺序

命中流程不建议一命中就 return。

更合理的是：

1. 收集 overlay interactive hits
2. 收集 scene hits
3. 统一过滤
4. 统一排序
5. 返回 top 或 all

推荐优先收集的对象：

```txt
handles
-> selection border
-> marquee border
-> rotate handle
-> scene node body
-> path segment / anchor
-> empty
```

注意：

这里的先收集 overlay 不代表最后一定固定 overlay 优先，而是 overlay 通常具有更高交互优先级。

最终仍然应通过 `priority + depth` 排序统一决定。

---

## CPU hit test 推荐实现方式

对于：

- handles
- selection border
- marquee border
- hover outline
- path anchors

这类数量通常较少、交互语义较强的目标，优先建议 CPU hit test。

实现思路：

```ts
function hitTestAll(point: Point): HitTarget[] {
  const hits: HitTarget[] = [];

  collectOverlayHits(point, hits);
  collectSceneHits(point, hits);

  return sortHits(hits);
}
```

排序示意：

```ts
function sortHits(hits: HitTarget[]): HitTarget[] {
  return hits.sort((a, b) => {
    if (a.priority !== b.priority) {
      return b.priority - a.priority;
    }
    return b.depth - a.depth;
  });
}
```

---

## Spatial Index 与 multi-hit

如果项目已经有 spatial index，例如：

- R-Tree
- Quadtree
- BVH

那么也不应该只拿一个目标。

更合理的流程是：

```txt
point
-> spatial index 查候选 bbox
-> 精确命中测试
-> 收集 hits
-> 排序
-> 返回 top 或 all
```

也就是说，spatial index 的职责是快速筛候选，不是直接决定唯一命中结果。

---

## GPU picking 与 multi-hit 的边界

普通 GPU picking 一次通常只能拿到最上层可见目标。

因此它更适合：

- top-most scene picking
- 快速普通对象命中
- 大量对象场景下的第一层命中

但它不天然适合：

- 穿透命中所有对象
- 复杂 overlay 交互对象多候选命中
- path segment / anchor 这类细粒度多候选选择

因此建议：

### GPU picking 主要负责

- top-most scene object
- 大场景快速首命中

### CPU hit test 主要负责

- handles
- border
- overlay interactive parts
- multi-hit collection
- 交互语义较强的命中结果

如果后续要做复杂 GPU 穿透 picking，可以作为单独优化项，不应作为当前基础架构前提。

---

## Cursor 与 multi-hit 的关系

cursor 通常只需要 top-most hit。

因此：

- cursor 继续使用 `hitTestTop`
- 穿透选择、循环选择使用 `hitTestAll`

也就是说：

**cursor 用 top-hit，穿透交互用 all-hits。**

这两者不冲突。

---

## 循环选择建议

multi-hit 最大的价值之一，是支持重叠对象的循环选择。

例如某一点下有多个 scene object：

```ts
[A, B, C];
```

可以实现：

- 第一次 click 选 A
- 第二次 click 选 B
- 第三次 click 选 C

建议上层维护类似状态：

```ts
type HitCycleState = {
  pointKey: string;
  hitIds: string[];
  index: number;
};
```

其中：

- `pointKey` 表示本次循环选择关联的位置
- `hitIds` 表示本位置命中的有序对象列表
- `index` 表示当前选到第几个

这部分逻辑应位于 interaction layer，而不是 renderer core。

---

## 推荐的最小接口方向

建议不要让 engine API 带太强业务词汇，而是面向通用渲染帧描述和命中支持。

例如：

```ts
interface ExistingRenderEngine {
  render(frame: RenderFrame): void;
  resize(width: number, height: number): void;
  updateInstances(batchId: string, updates: BufferRangeUpdate[]): void;
  updateUniforms(passId: string, updates: UniformUpdate[]): void;
  readPicking(x: number, y: number): PickingResult | null;
}
```

而 interaction / hittest 层可以单独有：

```ts
interface HitTestService {
  hitTestTop(point: Point, options?: HitTestOptions): HitTarget | null;
  hitTestAll(point: Point, options?: HitTestOptions): HitTarget[];
}
```

这里只是方向示意，不要求完全照搬。

核心思想是：

- render frame 是通用渲染输入
- updates 是增量的
- picking 是独立能力
- hit test 是独立能力
- 不暴露 selection / preview / guide / cursor 这种强业务方法

---

## 推荐的 Render Preparation Layer 输出结构

可以考虑类似：

```ts
type PreparedRenderFrame = {
  scene: PreparedPass;
  overlay: PreparedPass;
  picking?: PreparedPass;
};

type PreparedPass = {
  batches: PreparedBatch[];
  instanceUpdates: BufferRangeUpdate[];
  uniformUpdates: UniformUpdate[];
  dirty: boolean;
};

type PreparedBatch = {
  batchId: string;
  geometryKey: string;
  pipelineKey: string;
  instanceCount: number;
  ranges?: Array<{ start: number; count: number }>;
};
```

AI 后续可以基于现有 engine 的具体实现，把这里替换成更贴近项目的数据结构。

---

## 这次改造的重点不是重写 engine

必须明确：

这套方案的重点不是：

- 推翻现有 render engine
- 重新定义底层 buffer 管理
- 全面改造已有优化结构

重点是：

- 在 engine 之上补一层更清晰的 render preparation / orchestration
- 在渲染之外补一层更清晰的 hittest / interaction 组织
- 让编辑器语义不再直接污染 engine core
- 保留 engine 的已有优化成果
- 为 50K+ 元素场景下的增量更新与多命中交互提供更清晰边界

---

## 实施优先级建议

### Phase 1

先补 Render Preparation Layer，不动 engine 内核职责。

目标：

- 引入 RenderFrame / PassData 概念
- 区分 scene / overlay / picking
- 明确由上层负责 selection / guides / preview -> render data 的转换

---

### Phase 2

补 dirty 管理和 partial update。

目标：

- 单对象 instance update
- overlay 独立更新
- camera / uniform 独立更新

---

### Phase 3

补 hittest / interaction layer。

目标：

- top-hit
- all-hits
- cursor 解析
- overlay interactive hit test
- cycle selection

---

### Phase 4

补 picking pass 与 overlay/picking 的复用关系。

目标：

- scene picking
- handle picking
- 复用已有几何和实例布局

---

### Phase 5

再根据性能瓶颈决定是否继续：

- overlay cache
- offscreen target
- path / text 独立策略
- WebGPU backend
- 更细粒度 batch scheduler
- 更复杂 GPU picking

---

## 给 AI 的执行要求

后续 AI 在基于这份方案继续设计或改代码时，应遵守以下约束：

1. 不要推翻现有 render engine
2. 不要强行引入带强业务语义的底层 API
3. 尽量复用已有 buffer / batch / draw 优化
4. 优先增加上层 render preparation / frame orchestration
5. 优先支持 scene / overlay / picking 三类渲染组织
6. 优先实现 partial updates，而不是全量 rebuild
7. 必须加入独立的 hittest / interaction 设计
8. hit test 不应再固定成单目标返回
9. cursor 逻辑不应放进 engine core
10. 新结构必须兼容 50K+ 元素场景
11. 所有设计都应优先保证 engine core 的纯净性

---

## 最终结论

当前项目不需要重做 renderer。

更合理的路线是：

- 保留已有高性能 render engine
- 在其上新增一层 Render Preparation Layer
- 在渲染体系旁边新增一层 HitTest / Interaction Layer
- 将 selection / handles / guides / preview / picking / cursor 等编辑器语义从 engine core 解耦
- 使用 `scene + overlay + picking` 的方式组织渲染输入
- 使用 `top-hit + all-hits` 的方式组织命中结果
- 通过 dirty 标记、partial updates、geometry / instance 分离，支撑 50K+ 元素场景

一句话总结：

**继续让现有 engine 负责高效绘制，但不要再让它直接承担编辑器业务语义；在 engine 之上加一层面向编辑器的渲染准备层，在旁边加一层面向交互的命中与 cursor 控制层。**

---

## 可继续细化的方向

后续可以继续让 AI 细化：

- Render Preparation Layer 的目录结构
- HitTest / Interaction Layer 的目录结构
- PreparedPass / PreparedBatch / BufferRangeUpdate 的具体类型
- HitTarget / HitTestOptions / HitCycleState 的具体类型
- scene / overlay / picking 的最小实现顺序
- 如何接入现有 engine 的 batch 和 buffer 更新接口
- rect / image / line / handles / guides 的具体 batch schema
- 单元素拖拽时的完整更新链路
- overlay 与 picking 的共享策略
- cursor 旋转映射策略
- CPU hit test 与 GPU picking 的协作边界
