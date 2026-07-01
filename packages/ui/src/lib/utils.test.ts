import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { cn } from "./utils";

describe("cn", () => {
  it("merges conditional class values and resolves tailwind conflicts", () => {
    assert.equal(cn("px-2", false, null, undefined, "px-4", "text-sm"), "px-4 text-sm");
  });
});
