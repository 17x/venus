import assert from "node:assert/strict";
import test from "node:test";

import { createDefaultPostProcessChain } from "./postProcessChain";

test("default post-process chain includes tone mapping and gamma", () => {
  const chain = createDefaultPostProcessChain();
  assert.equal(chain.effects.length, 4);
  assert.equal(chain.effects[0].effect, "toneMapping");
  assert.equal(chain.effects[0].enabled, true);
  assert.equal(chain.effects[1].effect, "gamma");
  assert.equal(chain.effects[1].enabled, true);
});

test("default post-process chain has bloom disabled by default", () => {
  const chain = createDefaultPostProcessChain();
  const bloom = chain.effects.find((e) => e.effect === "bloom");
  assert.ok(bloom);
  assert.equal(bloom!.enabled, false);
});
