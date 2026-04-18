# Figma Prompt Document: Venus Left Tool Rail

## 1. Purpose

Design the **left vertical tool rail** for the Venus web-based vector editor.

This rail provides quick access to the most frequently used creation and interaction tools. It should feel compact, clear, professional, and immediately understandable during repeated daily use.

It is not a decorative navigation bar. It is a production editor tool rail.

---

## 2. Design goal

Create a left tool rail that feels:

- professional
- compact
- precise
- easy to scan
- highly recognizable
- low-noise
- efficient for repeated use
- integrated with the editor shell

The tool rail should visually support fast tool switching without becoming visually heavy.

---

## 3. Functional scope

The left rail should support the core creation and interaction tools of the editor.

Include structure or placeholders for tools such as:

### Selection tools

- move / select
- direct select

### Path and connector tools

- pen or path tool
- connector or line tool
- freehand or pencil tool

### Shape tools

- rectangle
- ellipse
- polygon
- star

### Content tools

- text

### Navigation tools

- hand / pan
- zoom in / zoom out if appropriate

If a tool group is expandable or could open sub-tools later, the visual design may hint at this, but the rail should remain clean and not overloaded.

---

## 4. Layout requirements

The tool rail should be a **narrow vertical strip** anchored to the left side of the editor shell.

Requirements:

- tools should be arranged in a clear vertical order
- spacing should be consistent and compact
- primary tools should be easy to distinguish
- the rail should support an obvious active tool state
- optional grouping or separators can be used where helpful
- the width should remain visually minimal
- the design should leave the canvas as the primary focus

Suggested organization:

1. selection tools
2. drawing and connector tools
3. shape tools
4. text tool
5. navigation tools toward the lower part of the rail if appropriate

Do not make the rail too wide or visually dominant.

---

## 5. Style direction

Use these style keywords:

- modern editor UI
- compact
- professional
- restrained
- precise
- minimal chrome
- tool-first
- low visual noise

Avoid:

- oversized buttons
- playful toy-like controls
- bright decorative color blocks
- heavy shadows
- exaggerated rounded shapes
- consumer-app styling

The rail should feel consistent with the top toolbar and right-side inspector.

---

## 6. Component expectations

Prefer patterns that map cleanly to reusable web UI primitives.

Likely component patterns:

- icon button
- toggleable tool button
- grouped icon stack
- separator
- tooltip
- active selection indicator

If any tool has sub-tools, the design may imply that through a small disclosure mark or grouping approach, but this should remain subtle.

Avoid over-designing the rail with unnecessary containers or decorative cards.

---

## 7. Visual system rules

### Button style

- icon-first buttons
- consistent button size
- compact but clickable target area
- neutral default state
- clear active state

### Active state

- active tool should be immediately obvious
- use restrained accent color, contrast, or shape treatment
- active state should be visually stronger than hover state

### Hover state

- hover should be visible but subtle
- do not rely on dramatic color shifts

### Separation

- use spacing or subtle separators to organize tool groups
- avoid heavy borders around every tool button

### Icons

- icon language should be consistent
- shapes should feel editor-like and professional
- icons should not be too thin, too cute, or overly decorative

---

## 8. State requirements

The design should account for these states.

### Tool states

- default
- hover
- active / selected
- disabled if relevant

### Structural states

- simple single tool entries
- grouped tools if needed
- possible future expandable sub-tool pattern

### Rail behavior

- stable visual presence
- should remain clear even when many tools are present
- should still feel clean when no tooltips are visible

---

## 9. What to optimize

Optimize for:

- quick recognition
- fast switching
- low visual distraction
- clean vertical rhythm
- strong active tool visibility
- consistency with the overall editor system
- realistic implementation in a desktop-first web editor

The rail should support the workflow without stealing attention from the canvas.

---

## 10. Output expectation

Design a production-ready left vertical tool rail for the Venus vector editor.

The output should include:

- a compact left-side tool strip
- icon-first tool buttons
- a clear active tool state
- sensible grouping or separators
- hover and active examples
- a layout that feels professional and implementable

The result should feel polished, practical, and consistent with the rest of the editor shell.

---

## 11. Short prompt version

```text
Design a left vertical tool rail for a desktop-first web vector editor called Venus.

This rail provides quick access to core editor tools.

Include tools such as:
- move / select
- direct select
- pen / path
- connector / line
- rectangle
- ellipse
- polygon
- star
- text
- freehand / pencil
- hand / pan
- zoom controls if appropriate

Style:
- modern editor UI
- professional
- compact
- precise
- restrained
- low visual noise
- production-ready

Rules:
- keep the rail narrow and unobtrusive
- use icon-first buttons
- make the active tool very clear
- allow hover, active, and disabled states
- use subtle grouping or separators when helpful
- avoid decorative or overly playful styling
- make the design easy to map to reusable web UI components
```
