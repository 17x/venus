# Figma Prompt Document: Venus Right Inspector

## 1. Purpose

Design the **right-side inspector panel** for the Venus web-based vector editor.

This panel is the main place for inspecting and editing the properties of the current selection. It should feel precise, compact, structured, and highly usable during long editing sessions.

It is not a generic settings page. It is a production editor inspector that must support object editing efficiently.

---

## 2. Design goal

Create a right inspector panel that feels:

- professional
- compact but readable
- precise
- structured
- low-noise
- efficient for repeated use
- easy to scan
- suitable for complex object editing

It should look like a serious editor-side panel, not like a consumer settings drawer.

---

## 3. Functional scope

The inspector should support the core editing properties for selected objects.

Likely sections include:

### Selection summary

- selected object type
- object name or label
- quick identity or metadata row if helpful

### Transform

- x
- y
- width
- height
- rotation
- lock aspect ratio if appropriate

### Appearance

- fill
- stroke
- stroke width
- opacity
- blend or related appearance settings if appropriate

### Text properties

When a text object is selected, allow space for:

- font family
- size
- weight
- alignment
- line height or spacing if needed

### Layer-related quick controls

If suitable, include lightweight access to:

- visibility
- lock
- grouping-related controls

### Advanced or expandable sections

Allow room for future advanced sections such as:

- effects
- corner radius
- constraints
- export-related object options

The design should support progressive disclosure rather than overwhelming the user all at once.

---

## 4. Layout requirements

The inspector should be a **stacked vertical panel** with grouped sections.

Requirements:

- sections should be clearly separated
- headers should be compact and readable
- content should feel dense but not cramped
- form rows should align cleanly
- labels, controls, and values should feel systematic
- the full panel should support vertical scrolling
- panel width should feel realistic for desktop web editor usage

Preferred layout pattern:

1. selection summary at the top
2. transform section
3. appearance section
4. text section when applicable
5. advanced collapsible sections below

Do not make it feel like a long generic settings form.

---

## 5. Style direction

Use these style keywords:

- modern editor UI
- precise
- compact
- professional
- restrained
- structured
- neutral
- productivity-focused

Avoid:

- oversized form controls
- decorative cards everywhere
- playful styling
- heavy shadows
- excessive whitespace
- visually noisy separators

The inspector should feel visually integrated with the rest of the editor shell.

---

## 6. Component expectations

Prefer practical patterns that map cleanly to shadcn/Radix-style components.

Likely component patterns:

- section header
- collapsible section
- label + input row
- numeric input
- compact select
- icon toggle button
- segmented control
- color swatch field
- opacity field
- tooltip
- scroll area
- inline action button
- compact switch or checkbox only where appropriate

Avoid inventing unusual controls unless they clearly serve editor-specific precision tasks.

---

## 7. Visual system rules

### Density

- medium to compact density
- suitable for tool-heavy editing workflows
- avoid oversized row height

### Alignment

- labels and controls should align consistently
- numeric fields should feel neat and structured
- repeated form rows should feel systematic

### Separation

- use subtle section separation
- avoid over-framing every section with heavy cards
- use spacing, headings, and light dividers for hierarchy

### Typography

- compact and readable
- clear distinction between section titles, labels, and values
- no decorative typography

### Color usage

- mostly neutral UI chrome
- restrained accent usage for active or selected subcontrols
- warnings or destructive colors only when truly needed

---

## 8. State requirements

The design should account for these states.

### Selection states

- nothing selected
- one shape selected
- one text object selected
- multiple objects selected
- mixed property values across selection

### Field states

- default
- focused
- hover
- disabled
- mixed value state
- invalid or constrained value state if useful

### Section states

- expanded
- collapsed
- empty / unavailable section when not relevant

The inspector should remain stable and understandable as content changes by selection type.

---

## 9. What to optimize

Optimize for:

- fast property editing
- readability under dense information
- strong section hierarchy
- consistent form rhythm
- professional editor feel
- realistic implementation in a web app

The inspector should help users edit efficiently without stealing too much attention from the canvas.

---

## 10. Output expectation

Design a production-ready right inspector panel for the Venus vector editor.

The output should include:

- a compact vertical inspector layout
- structured property sections
- transform fields
- appearance controls
- optional text properties when relevant
- collapsible advanced sections
- empty and populated states
- visually consistent control rows

The result should feel polished, practical, and implementable.

---

## 11. Short prompt version

```text
Design a right-side inspector panel for a desktop-first web vector editor called Venus.

This panel is used to inspect and edit properties of the current selection.

Include sections for:
- selection summary
- transform: x, y, width, height, rotation
- appearance: fill, stroke, stroke width, opacity
- text properties when a text object is selected
- collapsible advanced sections

Style:
- modern editor UI
- professional
- compact but readable
- neutral
- precise
- low visual noise
- production-ready

Rules:
- keep the panel structured and easy to scan
- use subtle section separation
- align labels and fields cleanly
- support empty, single-selection, multi-selection, text-selection, and mixed-value states
- avoid decorative or overly playful styling
- make the design easy to map to reusable web UI components
```
