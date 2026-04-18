# Figma Prompt Document: Venus Top Toolbar

## 1. Purpose

Design the **top toolbar** for the Venus web-based vector editor.

This toolbar sits below the top menu bar and above the main canvas workspace. It is one of the most frequently used parts of the interface and should feel efficient, structured, and production-ready.

The toolbar is for editing actions and quick controls, not for marketing or decorative presentation.

---

## 2. Design goal

Create a top toolbar that feels:

- professional
- compact
- precise
- highly usable
- visually organized
- suitable for repeated daily use
- easy to scan
- easy to map into reusable web UI components

It should look like a serious editor toolbar, not like a generic website header or dashboard filter bar.

---

## 3. Functional scope

The toolbar should support the following categories of actions and controls.

### Editing actions

- undo
- redo

### Visibility / lock / structure actions

- lock or unlock selection
- show or hide selection
- grouping or ungrouping related entry points

### Arrangement / alignment actions

- align left / center / right
- align top / middle / bottom
- distribute or arrange actions if space allows

### Style quick controls

- fill color preview or entry
- stroke color preview or entry
- stroke width or border width control
- opacity or style-related quick access if appropriate

### Context-sensitive controls

The toolbar may adapt based on selection type.
For example:

- when one shape is selected
- when multiple objects are selected
- when text is selected
- when nothing is selected

The visual system should make these contextual changes feel stable and understandable.

---

## 4. Layout requirements

The toolbar should be a **dense horizontal control strip** with clear grouping.

Requirements:

- controls should be grouped by purpose
- groups should be visually separated in a subtle way
- icon actions and input-style controls should feel consistent together
- the bar should support compact density without becoming visually cramped
- spacing should feel token-driven and systematic
- the toolbar should be implementable using reusable UI primitives

Preferred group order from left to right:

1. history actions
2. visibility / lock / grouping actions
3. alignment / arrangement actions
4. style quick controls
5. optional contextual controls

Do not make the toolbar overly long, decorative, or noisy.

---

## 5. Style direction

Use these style keywords:

- modern editor UI
- compact
- professional
- neutral
- restrained
- tool-first
- structured
- low-noise

Avoid:

- oversized controls
- excessive rounded toy-like buttons
- heavy shadows
- bright consumer-app colors
- decorative gradients
- excessive text labels on every control

The toolbar should feel like part of a larger professional editor shell.

---

## 6. Component expectations

Prefer patterns that can map cleanly to shadcn/Radix-style web components.

Likely component patterns:

- icon button
- grouped icon button set
- dropdown menu
- segmented action group
- select or compact select
- numeric input or stepper-style control
- tooltip
- separator
- compact pill or field shell for color / width display

The toolbar should avoid unusual one-off widgets unless they are clearly justified.

---

## 7. Visual system rules

### Sizing

- controls should be visually consistent in height
- icon buttons and small inputs should align well in one row
- target size should feel usable but compact

### Separation

- use subtle separators between groups
- use spacing and grouping more than heavy borders

### Icons

- icon style should be consistent
- active and inactive states should be easy to distinguish
- icons should not feel too thin, too cute, or overly decorative

### Labels

- labels may be omitted for common icon actions
- controls that need precision, such as stroke width, may include text or numeric display
- avoid crowding the toolbar with too much visible text

### Color usage

- neutral base chrome
- one restrained accent for active states
- hover states should be visible but subtle

---

## 8. State requirements

The design should include or account for these states.

### Button states

- default
- hover
- pressed or active
- disabled

### Selection context states

- no selection
- single object selected
- multiple objects selected
- text object selected

### Style control states

- fill active
- stroke active
- mixed selection values
- disabled when not applicable

The toolbar should feel stable even when its contextual content changes.

---

## 9. What to optimize

Optimize for:

- quick recognition
- compact operation
- reduced visual noise
- clear grouping
- strong implementation realism
- consistency with the rest of the editor shell

The toolbar should not dominate the page. It should support editing efficiently while letting the canvas remain the main focus.

---

## 10. Output expectation

Design a production-ready top toolbar for the Venus vector editor.

The output should include:

- a compact horizontal toolbar layout
- grouped control clusters
- consistent icon/button sizing
- style quick controls
- subtle separators
- active / hover / disabled examples
- a realistic editor feel

The result should be practical, polished, and easy to map into reusable code components.

---

## 11. Short prompt version

```text
Design a compact top toolbar for a desktop-first web vector editor called Venus.

This toolbar sits below the menu bar and above the canvas.

Include grouped controls for:
- undo / redo
- lock / visibility / grouping
- alignment / arrangement
- fill / stroke / stroke width and similar quick style controls
- optional contextual controls depending on selection

Style:
- modern editor UI
- professional
- compact
- neutral
- precise
- low visual noise
- production-ready

Rules:
- keep controls well-grouped
- use subtle separators
- keep icon/button sizing consistent
- allow hover, active, disabled, and contextual states
- avoid decorative or overly playful styling
- make the design easy to map to reusable web UI components
```
