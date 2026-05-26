import assert from "node:assert/strict";
import test from "node:test";

import { createEnginePassRegistrationAPI } from "./passRegistrationAPI";
import type { EngineRenderPass } from "./renderPassGraph";

const corePasses: EngineRenderPass[] = [
  { id: "shadow", name: "Shadow", targetId: null, dependencies: [], enabled: true },
  { id: "main", name: "Main", targetId: null, dependencies: ["shadow"], enabled: true },
];

test("core passes cannot be unregistered", () => {
  const api = createEnginePassRegistrationAPI(corePasses);
  assert.equal(api.unregisterPass("shadow"), false);
  assert.equal(api.unregisterPass("main"), false);
});

test("custom pass can be registered and unregistered", () => {
  const api = createEnginePassRegistrationAPI(corePasses);
  api.registerPass({ id: "custom", name: "Custom", targetId: null, dependencies: ["main"], enabled: true });
  assert.equal(api.isPassRegistered("custom"), true);
  assert.equal(api.unregisterPass("custom"), true);
  assert.equal(api.isPassRegistered("custom"), false);
});

test("cannot override core pass with same id", () => {
  const api = createEnginePassRegistrationAPI(corePasses);
  api.registerPass({ id: "shadow", name: "Override", targetId: null, dependencies: [], enabled: true });
  const passes = api.getRegisteredPasses();
  const shadow = passes.find((p) => p.id === "shadow");
  assert.equal(shadow?.name, "Shadow"); // Core pass preserved.
});
