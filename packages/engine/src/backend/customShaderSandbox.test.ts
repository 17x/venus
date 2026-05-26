import assert from "node:assert/strict";
import test from "node:test";

import { FORBIDDEN_SHADER_TOKENS, validateShaderSource } from "./customShaderSandbox";

test("validateShaderSource accepts clean GLSL", () => {
  assert.equal(validateShaderSource("void main() { gl_Position = vec4(0.0); }"), true);
});

test("validateShaderSource rejects discard token", () => {
  assert.equal(validateShaderSource("void main() { discard; }"), false);
});

test("validateShaderSource rejects gl_FragDepth", () => {
  assert.equal(validateShaderSource("void main() { gl_FragDepth = 0.0; }"), false);
});
