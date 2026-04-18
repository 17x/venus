# Figma Prompt Document: Venus Layer and History Panel

## 1. Purpose

Design the **Layer** and **History** panel area for the Venus web-based vector editor.

This area lives on the right side of the editor shell alongside Properties. It should support structural awareness and editing history in a way that feels compact, professional, and easy to scan.

These panels are not generic lists. They are core editor-support panels that help users understand document structure and editing progression.

---

## 2. Design goal

Create Layer and History panels that feel:

- professional
- compact but readable
- structured
- low-noise
- efficient for repeated use
- easy to scan
- consistent with the rest of the editor shell

The result should feel like a real editor side panel system, not a generic admin sidebar.

---

## 3. Functional scope

The design should support two main sections.

### Layer panel

The Layer panel should support:

- document structure visibility
- nested layer relationships
- selected layer indication
- visibility affordance
- lock affordance
- grouping or hierarchy representation
- compact item rows
- scrolling for long documents

Potential row content may include:

- layer icon
- layer name
- visibility state
- lock state
- selected state
- nesting depth or hierarchy indicator

### History panel

The History panel should support:

- chronological editing steps
- current history position
- readable action labels
- active step indication
- scrollable history list

Potential row content may include:

- action label
- current active step highlight
- optional timestamp or lightweight secondary metadata if useful

The design should prioritize clarity over decorative styling.

---

## 4. Layout requirements

The Layer and History area should be a **stacked right-side panel section**.

Requirements:

- Layer and History should each have a clear section header
- sections may be vertically stacked
- each section should support collapse / expand behavior
- content should support long scrolling lists
- row rhythm should be compact and consistent
- selected or active rows should be clearly visible
- the full area should feel integrated with Properties above or nearby

Preferred structure:

1. Layer section
2. History section

If tabs are considered, they must still feel professional and compact. A stacked layout is preferred unless space constraints clearly favor tabs.

---

## 5. Style direction

Use these style keywords:

- modern editor UI
- compact
- professional
- neutral
- structured
- restrained
- precise
- productivity-focused

Avoid:

- oversized list rows
- decorative cards for every item
- playful visuals
- heavy shadows
- excessive border noise
- dashboard-style sidebar treatment

The panel should feel consistent with the top toolbar, left tool rail, and right inspector.

---

## 6. Component expectations

Prefer patterns that map cleanly to reusable web UI components.

Likely component patterns:

- section header
- collapsible section
- scroll area
- tree list or nested list row
- selectable row
- icon button for visibility / lock affordances
- list item state highlight
- tooltip
- compact row actions

Avoid unusual custom list mechanics unless they are necessary for a professional editor workflow.

---

## 7. Visual system rules

### Row density

- compact but readable
- suitable for long lists
- avoid oversized row height

### Hierarchy

- nested layers should be visually understandable
- indentation should be clear but not exaggerated
- grouping and hierarchy should feel structured

### Active and selected states

- selected layer row should be immediately visible
- current history step should be clearly distinguished
- active states should be stronger than hover states

### Icons and affordances

- visibility and lock controls should be subtle but recognizable
- icons should be consistent with the rest of the editor
- avoid overly decorative icon treatments

### Separation

- use spacing, subtle dividers, and headers for structure
- avoid excessive framing of every row

---

## 8. State requirements

The design should account for these states.

### Layer panel states

- empty layer list
- populated layer list
- selected layer
- nested group expanded
- nested group collapsed
- hidden layer
- locked layer
- hover state on row

### History panel states

- empty history
- populated history
- current active step
- older inactive steps
- hover state on row

### Section states

- expanded
- collapsed
- long-content scroll state

The panel should remain stable and readable when the document becomes more complex.

---

## 9. What to optimize

Optimize for:

- fast structural understanding
- compact readability
- strong row hierarchy
- clear selected / active states
- low visual clutter
- implementation realism
- consistency with the full editor shell

These panels should support workflow clarity without becoming visually dominant.

---

## 10. Output expectation

Design a production-ready Layer and History panel area for the Venus vector editor.

The output should include:

- a compact Layer section with nested rows
- visibility and lock affordances
- clear selected layer treatment
- a compact History section with readable action rows
- clear current-step highlight
- scrollable content behavior
- collapsible section treatment
- a polished and realistic editor-side appearance

The result should feel practical, organized, and easy to implement.

---

## 11. Short prompt version

```text
Design the Layer and History panel area for a desktop-first web vector editor called Venus.

This area lives on the right side of the editor and should support document structure and editing history.

Include:
- a Layer section with nested rows, selected row state, visibility and lock controls, and hierarchy representation
- a History section with chronological action rows and a clear current-step highlight
- collapsible section headers
- compact scrollable list layouts

Style:
- modern editor UI
- professional
- compact but readable
- neutral
- structured
- low visual noise
- production-ready

Rules:
- keep list rows compact and consistent
- make selected / active rows very clear
- use subtle separators and hierarchy cues
- avoid decorative or overly playful styling
- make the design easy to map to reusable web UI components
```
