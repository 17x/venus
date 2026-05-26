import assert from "node:assert/strict";
import test from "node:test";

import { createEngineUndoRedoStack } from "./undoRedoStack";

test("new stack has no undo or redo available", () => {
  const stack = createEngineUndoRedoStack();
  assert.equal(stack.canUndo(), false);
  assert.equal(stack.canRedo(), false);
});

test("push adds command and enables undo", () => {
  const stack = createEngineUndoRedoStack();
  stack.push({ id: "1", description: "move", timestamp: Date.now(), inversePayload: {}, forwardPayload: {} });
  assert.equal(stack.canUndo(), true);
  assert.equal(stack.getUndoDepth(), 1);
});

test("undo returns command and enables redo", () => {
  const stack = createEngineUndoRedoStack();
  stack.push({ id: "1", description: "move", timestamp: 1, inversePayload: {}, forwardPayload: {} });
  const cmd = stack.undo();
  assert.equal(cmd?.id, "1");
  assert.equal(stack.canRedo(), true);
  assert.equal(stack.canUndo(), false);
});

test("redo restores undone command", () => {
  const stack = createEngineUndoRedoStack();
  stack.push({ id: "1", description: "move", timestamp: 1, inversePayload: {}, forwardPayload: {} });
  stack.undo();
  const cmd = stack.redo();
  assert.equal(cmd?.id, "1");
  assert.equal(stack.canUndo(), true);
  assert.equal(stack.canRedo(), false);
});

test("push after undo clears redo history", () => {
  const stack = createEngineUndoRedoStack();
  stack.push({ id: "1", description: "first", timestamp: 1, inversePayload: {}, forwardPayload: {} });
  stack.undo();
  stack.push({ id: "2", description: "second", timestamp: 2, inversePayload: {}, forwardPayload: {} });
  assert.equal(stack.canRedo(), false);
});

test("max depth evicts oldest commands", () => {
  const stack = createEngineUndoRedoStack(3);
  for (let i = 0; i < 5; i += 1) {
    stack.push({ id: `${i}`, description: `cmd${i}`, timestamp: i, inversePayload: {}, forwardPayload: {} });
  }
  // Only last 3 commands remain.
  assert.equal(stack.getUndoDepth(), 3);
});
