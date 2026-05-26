import assert from "node:assert/strict";
import test from "node:test";

import { createEngineFormatAdapterRegistry } from "./formatAdapterRegistry";

test("empty registry returns null for any extension", () => {
  const registry = createEngineFormatAdapterRegistry();
  assert.equal(registry.findForExtension("fbx"), null);
});

test("registry finds adapter by extension", () => {
  const registry = createEngineFormatAdapterRegistry();
  registry.register({
    format: "fbx",
    extensions: [".fbx"],
    parse: async () => ({}),
  });

  assert.ok(registry.findForExtension("fbx"));
  assert.ok(registry.findForExtension(".fbx"));
  assert.equal(registry.findForExtension("obj"), null);
});

test("registry returns registered formats", () => {
  const registry = createEngineFormatAdapterRegistry();
  registry.register({ format: "obj", extensions: [".obj"], parse: async () => ({}) });
  assert.deepEqual(registry.getRegisteredFormats(), ["obj"]);
});
