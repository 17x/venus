# Figma Prompt Document: Venus Vector Editor Shell

## 1. Project context

Design a desktop-first web vector editor interface for a product called **Venus**.

This is a professional editing tool, not a marketing page or dashboard.  
The UI should feel like a real production editor used for drawing, layout, selection, path editing, grouping, and property adjustment.

The current structure already includes:

- a top menu bar
- a top horizontal action toolbar
- a left vertical tool rail
- a central canvas workspace
- a right-side panel area with Properties, Layer, and History
- a bottom area with zoom and canvas status information

The design should preserve this overall structure, but improve visual consistency, spacing, hierarchy, and polish.

---

## 2. Core design goal

Create a unified and production-ready editor shell with the following qualities:

- professional
- precise
- compact but readable
- tool-first
- desktop productivity oriented
- clean and buildable
- visually consistent
- suitable for long working sessions
- minimal visual noise
- strong information hierarchy

The interface should look like a modern editor product, not like a generic admin dashboard.

---

## 3. Layout requirements

Preserve this layout model:

### Top menu bar

Contains high-level menu entries such as:

- File
- Edit
- Shape
- Layer
- language switch or workspace status on the right

This row should feel light, stable, and secondary to the main editing toolbar.

### Top action toolbar

A dense horizontal toolbar below the menu bar.

It should support:

- undo / redo
- lock / visibility / grouping related actions
- alignment or arrangement related actions
- style quick actions such as color / stroke / settings
- numeric control such as stroke width selector

This toolbar should be compact, well-grouped, and visually segmented.

### Left tool rail

A vertical tool rail for frequently used creation and interaction tools.

Include visual placeholders or structure for:

- move / select
- direct select
- connector / pen / path-related tool
- rectangle
- ellipse
- polygon
- star
- text
- pencil or freehand
- hand / pan
- zoom in / zoom out

The active tool should be very clear.

### Center canvas area

The center should remain the main workspace.

It should include:

- a large editable canvas artboard
- subtle surrounding background
- clear separation between canvas and app chrome
- enough neutral space for focus

The current screenshot includes shapes, text blocks, and graphic examples.  
The redesigned version may change the visual style of these sample objects, but should preserve the idea of a mixed-content demo canvas.

### Right panel area

A stacked panel region on the right.

Current sections:

- Properties
- Layer
- History

These should remain as the core right-side information structure.

Requirements:

- each panel section should be collapsible
- headers should be clear and compact
- content areas should feel tidy and professional
- the whole side panel should support long content without visual clutter

### Bottom status / zoom area

Preserve bottom utility information such as:

- zoom percentage
- canvas coordinate or cursor info
- lightweight status data

This should feel low-noise and secondary.

---

## 4. Style direction

Use a unified style language with these keywords:

- modern editor UI
- neutral professional
- precise
- subtle
- structured
- compact
- low-saturation
- minimal chrome
- soft panel contrast
- restrained use of accent color

Avoid:

- playful consumer app style
- overly rounded toy-like controls
- overly glossy gradients in chrome
- marketing landing page aesthetics
- oversized spacing
- excessive decorative shadows

The style may be light theme or refined light-neutral professional theme.  
It should feel consistent across toolbar, side panels, menus, and canvas framing.

---

## 5. Visual system rules

### Color

Use a restrained palette:

- neutral light gray background for application chrome
- white or near-white panels
- subtle borders
- one main accent color for active tool / selected state
- warning or destructive colors only where needed

### Border and separation

- use subtle borders and dividers
- avoid heavy outlines everywhere
- sections should be distinguishable without looking noisy

### Radius

- use consistent corner radius
- slightly rounded controls are okay
- avoid mixing many different radius values

### Shadows

- minimal or very soft shadows
- rely more on spacing and borders than dramatic elevation

### Typography

- clean sans-serif
- compact but readable
- clear hierarchy between panel titles, labels, and content
- no decorative type choices

### Density

- medium to compact density
- suited for tool-heavy workflows
- avoid overly large buttons and oversized panel paddings

---

## 6. Component expectations

Design using practical, reusable product UI patterns.

Prefer components that can map cleanly to a shadcn/Radix-style web app system, such as:

- button
- icon button
- segmented toolbar groups
- dropdown menu
- collapsible panel section
- tabs if needed
- input
- numeric input
- select
- tooltip
- scroll area
- tree / layer list
- history list
- panel cards or grouped sections

Avoid inventing unusual custom controls unless they are clearly necessary for a vector editor.

Canvas-specific controls may be more custom, but the chrome around them should stay systematized.

---

## 7. Interaction and state requirements

The design should account for these states:

### Toolbar and tools

- default
- hover
- active tool
- disabled
- grouped controls

### Right panel

- empty properties state when nothing is selected
- populated state when one object is selected
- multi-selection state
- collapsible panel sections
- scrollable content area

### Layer panel

- nested layer list feel
- visible selected row
- support visibility / lock / grouping affordances
- compact tree-like structure

### History panel

- timeline/list appearance
- active item highlight
- readable but not visually dominant

### Canvas shell

- neutral workspace background
- clear artboard focus
- optional selected object emphasis
- clean canvas chrome separation

---

## 8. What should be improved from the current version

Improve the current interface in these ways:

- stronger overall visual consistency
- tighter alignment and spacing system
- clearer grouping in the top toolbar
- cleaner hierarchy between menu, toolbar, canvas, and side panels
- more polished right-side panel design
- more deliberate active/inactive states
- stronger professional editor feel
- less “prototype UI” feeling
- more unified icon/button sizing
- better balance between density and readability

Do not change the overall shell architecture too much.  
This is a refinement and elevation of the current structure, not a completely different product layout.

---

## 9. Canvas content guidance

Inside the canvas, include a representative demo scene using mixed objects, such as:

- rounded rectangle
- star
- irregular polygon
- text blocks
- image-like card or mood board tile
- connector/line example
- a transformed or rotated object
- grouped object example

This scene should help show the editor’s capabilities, but should not overpower the chrome design.

The canvas example should feel intentional and balanced.

---

## 10. Output expectation

Create a polished editor shell design that includes:

- menu bar
- top toolbar
- left tool rail
- center canvas workspace
- right stacked side panels
- bottom utility/status area

The design should be visually unified and implementation-friendly.

Prioritize:

- structure
- consistency
- readability
- production realism

Do not generate a flashy concept piece.  
Generate something that looks like a serious editor product UI that a frontend team could actually implement.

---

## 11. Variant request

Generate 2 to 3 stylistic variations while preserving the same information architecture:

### Variant A

Clean neutral professional

### Variant B

Slightly darker, more tool-centric pro editor feel

### Variant C

More refined modern product polish, but still restrained and buildable

All variants must preserve:

- layout logic
- panel structure
- toolbar logic
- editor productivity feel

---

## 12. Extra constraint for implementation

This UI should be easy to map into a component-based web app using reusable UI primitives.

So:

- keep repeated patterns consistent
- do not over-customize every control
- keep toolbar buttons, panel headers, lists, and form controls systematic
- make spacing and sizing feel token-driven
- avoid one-off decorative UI decisions

---

## 13. Short prompt version

If you want a shorter version for Figma AI, use this:

```text
Design a desktop-first web vector editor interface for a product called Venus.

Preserve this layout:
- top menu bar
- top horizontal action toolbar
- left vertical tool rail
- center canvas workspace
- right-side panels for Properties, Layer, and History
- bottom utility/status area

Style:
- modern editor UI
- professional
- precise
- compact but readable
- neutral light theme
- subtle borders
- restrained accent color
- minimal visual noise
- buildable and production-ready

Requirements:
- keep the current shell architecture
- improve consistency, spacing, hierarchy, and polish
- toolbar should feel compact and well-grouped
- right-side panels should feel clean and professional
- preserve a mixed-content demo canvas with shapes, text, connectors, and transformed objects
- include active, hover, disabled, empty, and selected states where relevant
- use practical reusable UI patterns
- avoid decorative or overly playful styling

Generate 2 to 3 stylistic variations while keeping the same layout logic.
```
