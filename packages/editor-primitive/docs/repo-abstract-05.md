# Selector & Pointer Selector 设计（editor-primitive）

## 1. 目标

```
统一 selection / hover / marquee / click 的语义与执行分层
```

---

## 2. 核心分层

### 2.1 Engine（能力层）

提供纯查询能力：

```
hitTest(point)
queryRect(rect)
queryPath(path)
```

特点：

- 无 UI
- 无交互状态
- 支持 transform / group / mask
- 基于 scene graph 或 spatial index

---

### 2.2 Editor-Primitive（交互层）

负责 pointer selector：

```
- pointer down / move / up
- click / marquee 判定
- modifier（shift / cmd）
- selection 模式（replace / add / toggle）
- overlay（marquee / hover）
```

---

### 2.3 App State（状态层）

```
selectedIds
hoverId
```

---

## 3. Selector（查询语义）

### 3.1 定义

```
输入：point / rect / path
输出：targets（元素集合）
```

---

### 3.2 API

```
selectPoint(point, options)
selectRect(rect, options)
selectPath(path, options)
```

options：

```
- mode: intersect | contain
- tolerance（screen px）
- includeLocked
- includeHidden
```

---

### 3.3 约束

```
- 所有 selector 在 screen space 或统一 world→screen 后执行
- 与 render / hover 使用同一坐标体系
```

---

## 4. Pointer Selector（交互状态机）

### 4.1 状态

```
idle
pending（按下但未判定）
marquee
```

---

### 4.2 输入

```
pointer events
keyboard modifiers
```

---

### 4.3 输出

```
selection change
overlay（marquee box）
```

---

## 5. 交互流程

### 5.1 Pointer Down

```
start = worldPos(pointer)
state = pending
```

---

### 5.2 Pointer Move

```
if (distance > threshold):
  state = marquee

marqueeRect = normalize(start, current)
```

---

### 5.3 Pointer Up

#### click

```
targets = engine.selectPoint(point)
applySelection(targets)
```

#### marquee

```
targets = engine.selectRect(rect)
applySelection(targets)
```

---

## 6. Selection 逻辑

```
replace:
  selection = targets

add（shift）:
  selection += targets

toggle（cmd）:
  selection ^= targets
```

---

## 7. Overlay（UI 层）

### 7.1 Marquee

```
- screen space 渲染
- 不进入 scene graph
- 不参与 snapshot / tile
```

---

### 7.2 Hover

```
使用同一 selector
```

### 7.3 Overlay 数据流与描述协议（关键）

#### 设计原则

```
selector 只负责“算”（world space）
overlay 只负责“画”（screen space）
editor-primitive 负责“桥接转换”
```

---

#### 数据流

```
worldRect（selection / marquee 计算）
  ↓ project（world → screen）
screenRect（overlay geometry）
  ↓
OverlayItem（描述协议）
  ↓
engine.renderOverlay(items)
```

---

#### OverlayItem（统一描述）

```
OverlayItem = {
  type: 'marquee' | 'hoverOutline' | 'selectionBox' | 'handler',
  geometry: ScreenSpaceGeometry,
  style: {
    stroke?: string,
    fill?: string,
    dash?: number[],
    width?: number
  },
  zIndex?: number
}
```

说明：

```
- geometry 一律使用 screen space
- style 只描述视觉，不包含逻辑
- zIndex 控制 overlay 内部层级（例如 handler 在最上）
```

---

#### Editor-Primitive 输出

```
// 例：marquee
OverlayItem {
  type: 'marquee',
  geometry: rect(screen),
  style: { dash: [4, 2] }
}
```

---

#### Engine 责任

```
renderOverlay(items)
```

仅负责：

```
- 批量绘制
- zIndex 排序
- GPU / canvas 执行
```

不负责：

```
- 选择逻辑
- pointer 状态
- 几何计算（world）
```

---

#### 关键约束

```
1. overlay 不进入 scene graph
2. overlay 不参与 snapshot / tile
3. overlay 始终基于当前 viewMatrix 渲染
4. selector 与 overlay 使用同一坐标变换（避免偏移）
```

---

#### 一句话总结

```
先在 world 算，再到 screen 画，中间用 descriptor 解耦
```

---

## 8. 关键约束

```
1. selector 与 pointer selector 必须分层
2. render / hit / overlay 使用同一 viewMatrix
3. snapshot / tile 不参与 selection
4. handler 命中优先于 element
```

---

## 9. 一句话总结

```
engine 决定“能选什么”
editor-primitive 决定“什么时候选、怎么选”
```

---

## 10. Selection Priority & Semantics（防止选错的规则）

### 10.1 命中优先级（从高到低）

```
1. handler（resize / rotate）
2. anchor / control point
3. element（shape / text / image）
4. group（作为整体）
```

规则：

```
命中链路必须短路（命中高优先级即停止）
```

否则会出现：

- 点 handler 选中 element
- 点 anchor 命中 path

---

### 10.2 Click 语义（单点选择）

```
selectPoint：
  返回 z-order 最上层目标（topmost）
```

可选：

```
- 多次点击循环（cycle selection）
```

---

### 10.3 Marquee 语义（区域选择）

默认：

```
mode = contain（完全包裹）
```

按键修改：

```
shift → intersect（接触即选）
alt   → 忽略 group（只选叶子节点）
```

---

### 10.4 Group 行为

```
click：
  默认选 group（整体）
  modifier 可进入子级（drill down）

marquee：
  默认返回叶子节点
```

---

### 10.5 锁定 / 隐藏元素

```
locked：
  不可被 selection（除非 includeLocked）

hidden：
  不参与 selection
```

---

### 10.6 Tolerance 统一

```
tolerance = screen px（统一常量，例如 4~8px）
```

应用于：

- click 命中
- path / stroke
- anchor

---

### 10.7 一句话总结

```
点的是“最上面最具体的东西”，
框的是“符合规则的一批东西”
```
