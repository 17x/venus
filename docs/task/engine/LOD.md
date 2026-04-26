

# Element Visibility LOD Rules

## 1. Purpose

This document defines the default element visibility and rendering LOD rules for the editor.

The renderer should not always render every element at full quality.

LOD should reduce rendering cost for small, far away, or interaction-time elements.

The rules are based mainly on the element's projected screen size, not only on zoom.

---

## 2. Required Metrics

Before rendering an element, calculate these values:

```txt
screenWidth = abs(elementWorldWidth * zoom)
screenHeight = abs(elementWorldHeight * zoom)
screenArea = screenWidth * screenHeight
screenMaxSide = max(screenWidth, screenHeight)
screenMinSide = min(screenWidth, screenHeight)
projectedFontSize = fontSize * zoom
projectedStrokeWidth = strokeWidth * zoom
```

LOD priority:

```txt
1. screenArea
2. screenMaxSide / screenMinSide
3. interaction state
4. zoom
5. element type
6. style complexity
```

---

## 3. Common Element LOD

Apply these default rules to normal shapes, paths, images, groups, and generic visual nodes.

```txt
screenArea < 0.25 px²:
  skip rendering

screenArea < 1 px²:
  render as 1px point

screenArea < 9 px²:
  render as solid color block

screenArea < 64 px²:
  render bbox only

screenArea < 4096 px²:
  simplified rendering

screenArea >= 4096 px²:
  normal rendering
```

Meaning:

```txt
skip:
  draw nothing

point:
  draw 1px or 2px point

solid color block:
  draw a simple filled rect using placeholder color

bbox:
  draw bounding box only, no detail

simplified:
  draw fill/stroke with reduced effects

normal:
  draw normally unless other rules downgrade it
```

---

## 4. DPR LOD

Do not always render tiles or cached content at device DPR.

Use lower DPR at very low zoom or during interaction.

```txt
zoom < 0.05:
  renderDpr = 0.5

zoom < 0.125:
  renderDpr = 0.75

zoom < 0.25:
  renderDpr = 1

zoom < 1:
  renderDpr = min(deviceDpr, 1.5)

zoom >= 1:
  renderDpr = deviceDpr
```

Interaction override:

```txt
zooming / panning / dragging:
  base scene renderDpr = min(currentRenderDpr, 1)

active selected elements:
  may use deviceDpr if affordable
```

---

## 5. Shadow LOD

Shadow is expensive. Disable it aggressively for small elements and interaction states.

```txt
zoom < 0.5:
  do not render shadow

screenArea < 4096 px²:
  do not render shadow

screenArea < 16384 px²:
  render simplified shadow

screenArea >= 16384 px²:
  render normal shadow
```

Interaction override:

```txt
zooming / panning:
  do not render shadow

dragging:
  base scene does not render shadow
  active element may render simplified shadow if affordable
```

Simplified shadow rule:

```txt
max blur = 8px
spread = 0
opacity <= 0.25
```

---

## 6. Filter / Blur / Effect LOD

Filters are expensive and should be disabled earlier than normal fill/stroke.

Affected effects:

```txt
blur
drop-shadow
complex filter
backdrop-like effect
complex mask
expensive blend mode
```

Rules:

```txt
zoom < 0.5:
  do not render filter / blur / expensive effect

screenArea < 8192 px²:
  do not render filter / blur / expensive effect

screenArea < 32768 px²:
  render simplified effect if needed

screenArea >= 32768 px²:
  render normal effect
```

Interaction override:

```txt
zooming / panning / dragging:
  do not render filter / blur / expensive effect
```

---

## 7. Stroke LOD

Stroke can be skipped when it becomes too small on screen.

```txt
screenArea < 9 px²:
  do not render stroke

projectedStrokeWidth < 0.5px:
  do not render stroke

projectedStrokeWidth < 1px:
  render hairline stroke

projectedStrokeWidth >= 1px:
  render normal stroke
```

For complex paths:

```txt
if path is simplified or bbox mode:
  stroke should also be simplified or skipped
```

---

## 8. Text LOD

Text is expensive. LOD should be based mainly on projected font size.

```txt
projectedFontSize < 3px:
  do not render text

projectedFontSize < 6px:
  render text as solid color block

projectedFontSize < 10px:
  render simplified text
  no wrapping
  no decoration
  no text shadow
  no complex layout

projectedFontSize >= 10px:
  render normal text

projectedFontSize >= 18px:
  render full text if idle
```

Interaction override:

```txt
zooming / panning:
  projectedFontSize < 12px should become block or hidden

dragging:
  active text may stay readable
  base scene text can be downgraded
```

Simplified text means:

```txt
single-line preview only
no text decoration
no text shadow
no precise caret / selection rendering
```

Active text editing is special:

```txt
active editing text:
  do not downgrade caret
  do not downgrade selected text highlight
  keep editing feedback precise
```

---

## 9. Image LOD

Images must not always use original textures.

Use thumbnails according to projected screen size.

```txt
screenArea < 1 px²:
  do not render image

screenArea < 16 px²:
  render average color block

screenMaxSide <= 64px:
  use 64px thumbnail

screenMaxSide <= 128px:
  use 128px thumbnail

screenMaxSide <= 256px:
  use 256px thumbnail

screenMaxSide <= 512px:
  use 512px thumbnail

screenMaxSide <= 1024px:
  use 1024px thumbnail

screenMaxSide > 1024px:
  use original / high-res texture only when idle
```

Interaction override:

```txt
zooming / panning / dragging:
  do not upload higher-resolution image texture during interaction
  use existing texture if available
  max image LOD should be 512px or 1024px thumbnail
```

Recommended image cache levels:

```txt
average color
thumbnail-64
thumbnail-128
thumbnail-256
thumbnail-512
thumbnail-1024
original / high-res
```

---

## 10. Path LOD

Complex paths should be downgraded by projected size.

```txt
screenArea < 1 px²:
  do not render path

screenArea < 9 px²:
  render as point

screenArea < 64 px²:
  render bbox

screenArea < 4096 px²:
  render simplified path

screenArea >= 4096 px²:
  render normal path
```

Path simplification tolerance:

```txt
zoom < 0.05:
  tolerance = 8 world px

zoom < 0.125:
  tolerance = 4 world px

zoom < 0.25:
  tolerance = 2 world px

zoom < 1:
  tolerance = 1 world px

zoom >= 1:
  tolerance = 0 or very small
```

During interaction:

```txt
zooming / panning:
  prefer simplified path or bbox

dragging:
  base scene can simplify path
  active path may remain normal if affordable
```

---

## 11. Group LOD

Groups should not always render all children.

Use group-level LOD first, then child-level LOD if needed.

```txt
screenArea < 1 px²:
  do not render group

screenArea < 9 px²:
  render group as point

screenArea < 64 px²:
  render group bbox

screenArea < 4096 px²:
  render group thumbnail / color block

screenArea < 65536 px²:
  render children with child LOD

screenArea >= 65536 px²:
  render children normally, but each child can still apply its own LOD
```

Group thumbnail is useful when:

```txt
group has many children
group appears small on screen
group is not selected
group is not being edited
group is not active during interaction
```

Do not use group thumbnail when:

```txt
group is selected and needs precise handles
group is being edited internally
child-level hover / hit feedback is required
```

---

## 12. Placeholder Color Rules

When rendering point / block / bbox / thumbnail fallback, choose placeholder color by element type.

```txt
image:
  use average color or dominant color

text:
  use text fill color, fallback to neutral gray

shape:
  use fill color

path:
  use stroke color first, fallback to fill color

group:
  use cached average color or dominant child color

unknown:
  use neutral gray
```

---

## 13. Interaction Degrade Rules

Interaction state can downgrade rendering quality even if the element is large.

### idle

```txt
allow normal / full rendering
allow high-res image if needed
allow shadow / filter if thresholds pass
```

### zooming

```txt
base scene DPR <= 1
no shadow
no filter / blur
no high-res image upload
text below 12px becomes block or hidden
path prefers simplified / bbox
```

### panning

```txt
same as zooming
prefer cached tile / thumbnail / simplified render
```

### dragging

```txt
base scene DPR <= 1
base scene no shadow / filter
active selected elements can be clearer
do not upload high-res images during drag
large active selection may use snapshot texture
```

---

## 14. Selection / Hover Exceptions

Do not over-downgrade active interaction feedback.

These should stay precise:

```txt
selection bounds
resize handles
rotation handles
hover outline
marquee rectangle
snap guides
active editing caret
active path control points
```

Rules:

```txt
selected element:
  may downgrade base fill/path/image
  but selection overlay must remain precise

hovered element:
  hover outline should remain visible if hit test succeeds

active editing element:
  editing UI should remain precise
```

---

## 15. Summary Table

```txt
General:
  area < 0.25        -> skip
  area < 1           -> point
  area < 9           -> color block
  area < 64          -> bbox
  area < 4096        -> simplified
  area >= 4096       -> normal

DPR:
  zoom < 0.05        -> 0.5 DPR
  zoom < 0.125       -> 0.75 DPR
  zoom < 0.25        -> 1 DPR
  zoom < 1           -> min(deviceDpr, 1.5)
  zoom >= 1          -> deviceDpr
  interaction active -> base scene DPR <= 1

Shadow:
  zoom < 0.5         -> off
  area < 4096        -> off
  area < 16384       -> simplified
  area >= 16384      -> normal
  interaction active -> off for base scene

Filter / Blur:
  zoom < 0.5         -> off
  area < 8192        -> off
  area < 32768       -> simplified
  area >= 32768      -> normal
  interaction active -> off

Stroke:
  area < 9           -> off
  stroke < 0.5px     -> off
  stroke < 1px       -> hairline
  stroke >= 1px      -> normal

Text:
  font < 3px         -> hidden
  font < 6px         -> block
  font < 10px        -> simplified
  font >= 10px       -> normal
  font >= 18px       -> full if idle

Image:
  area < 1           -> hidden
  area < 16          -> average color block
  maxSide <= 64      -> thumbnail-64
  maxSide <= 128     -> thumbnail-128
  maxSide <= 256     -> thumbnail-256
  maxSide <= 512     -> thumbnail-512
  maxSide <= 1024    -> thumbnail-1024
  maxSide > 1024     -> original / high-res only when idle

Path:
  area < 1           -> hidden
  area < 9           -> point
  area < 64          -> bbox
  area < 4096        -> simplified
  area >= 4096       -> normal

Group:
  area < 1           -> hidden
  area < 9           -> point
  area < 64          -> bbox
  area < 4096        -> group thumbnail / color block
  area < 65536       -> children with child LOD
  area >= 65536      -> children normal, child LOD still allowed
```

---

## 16. Implementation Order

Implement in this order:

```txt
Stage 1:
  common screenArea LOD
  skip / block / bbox / normal

Stage 2:
  interaction degrade
  no shadow / no filter / DPR <= 1 during zooming and panning

Stage 3:
  image thumbnail LOD

Stage 4:
  text LOD

Stage 5:
  stroke / path LOD

Stage 6:
  group thumbnail LOD

Stage 7:
  LOD stats and debug overlay
```

---

## 17. Required Debug Stats

Add counters to verify LOD is working.

```txt
hiddenCount
pointCount
blockCount
bboxCount
simplifiedCount
normalCount
fullCount
shadowSkippedCount
filterSkippedCount
thumbnailImageCount
fullImageCount
groupThumbnailCount
lodDecisionTimeMs
```

The renderer should expose these stats in dev mode.