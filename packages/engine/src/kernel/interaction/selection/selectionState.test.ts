import assert from "node:assert/strict";
import test from "node:test";

import { createEngineSelectionState } from "./selectionState";
import type { EngineSelectionFilter, EngineSelectionHit, EngineSelectionMode } from "./selectionMode.contract";

/** Creates a default selection filter accepting all layers and not excluding hidden/locked. */
function makeDefaultFilter(): EngineSelectionFilter {
  return { layers: ["all"], excludeHidden: false, excludeLocked: false };
}

/** Creates a minimal selection hit for one node. */
function makeHit(id: string, overrides?: Partial<EngineSelectionHit>): EngineSelectionHit {
  return { id, layer: "mesh", hidden: false, locked: false, ...overrides };
}

/** Verifies single selection mode replaces the entire set with the top hit. */
test("single selection replaces set with top hit", () => {
  const state = createEngineSelectionState();

  // First selection.
  const event1 = state.applySelection(
    [makeHit("a"), makeHit("b")],
    "single",
    makeDefaultFilter(),
  );
  assert.deepEqual(event1.added, ["a"]);
  assert.deepEqual(event1.removed, []);
  assert.deepEqual(event1.selected, ["a"]);

  // Second selection replaces.
  const event2 = state.applySelection(
    [makeHit("c")],
    "single",
    makeDefaultFilter(),
  );
  assert.deepEqual(event2.added, ["c"]);
  assert.deepEqual(event2.removed, ["a"]);
  assert.deepEqual(event2.selected, ["c"]);
});

/** Verifies additive selection mode unions hits with the current set. */
test("additive selection unions hits with current set", () => {
  const state = createEngineSelectionState();

  state.applySelection([makeHit("a")], "single", makeDefaultFilter());
  const event = state.applySelection(
    [makeHit("b"), makeHit("c")],
    "additive",
    makeDefaultFilter(),
  );

  assert.deepEqual(event.added, ["b", "c"]);
  assert.deepEqual(event.removed, []);
  assert.deepEqual(event.selected, ["a", "b", "c"]);
});

/** Verifies subtractive mode toggles individual hits. */
test("subtractive selection toggles hits", () => {
  const state = createEngineSelectionState();

  state.applySelection([makeHit("a"), makeHit("b")], "additive", makeDefaultFilter());

  // Toggle "a" off, keep "b".
  const event = state.applySelection(
    [makeHit("a")],
    "subtractive",
    makeDefaultFilter(),
  );

  assert.deepEqual(event.added, []);
  assert.deepEqual(event.removed, ["a"]);
  assert.deepEqual(event.selected, ["b"]);
  assert.equal(state.isSelected("a"), false);
  assert.equal(state.isSelected("b"), true);
});

/** Verifies box selection adds all enclosed hits. */
test("box selection adds all enclosed hits", () => {
  const state = createEngineSelectionState();

  const event = state.applySelection(
    [makeHit("a"), makeHit("b"), makeHit("c")],
    "box",
    makeDefaultFilter(),
  );

  assert.deepEqual(event.added, ["a", "b", "c"]);
  assert.deepEqual(event.selected, ["a", "b", "c"]);
});

/** Verifies layer filtering excludes non-matching layers. */
test("layer filter excludes non-matching layers", () => {
  const state = createEngineSelectionState();
  const filter: EngineSelectionFilter = {
    layers: ["mesh"],
    excludeHidden: false,
    excludeLocked: false,
  };

  const event = state.applySelection(
    [makeHit("a", { layer: "mesh" }), makeHit("b", { layer: "gizmo" }), makeHit("c", { layer: "helper" })],
    "box",
    filter,
  );

  assert.deepEqual(event.selected, ["a"]);
});

/** Verifies hidden nodes are excluded when excludeHidden is true. */
test("excludeHidden filter removes hidden nodes", () => {
  const state = createEngineSelectionState();
  const filter: EngineSelectionFilter = {
    layers: ["all"],
    excludeHidden: true,
    excludeLocked: false,
  };

  const event = state.applySelection(
    [makeHit("a", { hidden: true }), makeHit("b", { hidden: false })],
    "box",
    filter,
  );

  assert.deepEqual(event.selected, ["b"]);
});

/** Verifies clearSelection empties the set and reports removals. */
test("clearSelection empties the set", () => {
  const state = createEngineSelectionState();

  state.applySelection([makeHit("a"), makeHit("b")], "additive", makeDefaultFilter());
  const event = state.clearSelection();

  assert.deepEqual(event.added, []);
  assert.deepEqual(event.removed, ["a", "b"]);
  assert.deepEqual(event.selected, []);
});

/** Verifies setSelection replaces the set directly. */
test("setSelection replaces the set directly", () => {
  const state = createEngineSelectionState();

  state.applySelection([makeHit("a")], "single", makeDefaultFilter());
  const event = state.setSelection(["x", "y", "z"]);

  assert.deepEqual(event.added, ["x", "y", "z"]);
  assert.deepEqual(event.removed, ["a"]);
  assert.deepEqual(event.selected, ["x", "y", "z"]);
});

/** Verifies locked nodes are excluded when excludeLocked is true. */
test("excludeLocked filter removes locked nodes", () => {
  const state = createEngineSelectionState();
  const filter: EngineSelectionFilter = {
    layers: ["all"],
    excludeHidden: false,
    excludeLocked: true,
  };

  const event = state.applySelection(
    [makeHit("a", { locked: true }), makeHit("b", { locked: false })],
    "box",
    filter,
  );

  assert.deepEqual(event.selected, ["b"]);
});

/** Verifies empty hit set with single mode clears selection. */
test("single mode with empty hits clears selection", () => {
  const state = createEngineSelectionState();

  state.applySelection([makeHit("a")], "single", makeDefaultFilter());
  const event = state.applySelection([], "single", makeDefaultFilter());

  assert.deepEqual(event.added, []);
  assert.deepEqual(event.removed, ["a"]);
  assert.deepEqual(event.selected, []);
});
