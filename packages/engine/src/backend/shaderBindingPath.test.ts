import assert from "node:assert/strict";
import test from "node:test";

import { createEmptyShaderBindingPath } from "./shaderBindingPath";

test("empty shader binding path has no uniforms or textures", () => {
  const path = createEmptyShaderBindingPath();
  assert.equal(path.uniforms.length, 0);
  assert.equal(path.textures.length, 0);
});
