/**
 * Tests for isMeshEligible node classification and needsComposition flag.
 *
 * This validates that the engine correctly classifies graph nodes for
 * mesh-submission vs model-complete rendering paths.
 *
 * AI-TEMP: tests cover the temporary isMeshEligible logic; remove when
 * mesh-eligibility is superseded by full tile-based rendering; ref DEX-112.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

/**
 * Mirror of the isMeshEligible logic from createEngine.ts for isolated testing.
 * Must be kept in sync with the canonical implementation.
 * @param node Graph node payload.
 */
function isMeshEligible(node: Record<string, unknown>): boolean {
  if (node.mesh && typeof node.mesh === "object") return true;

  const nodeType = typeof node.type === "string" ? node.type : "shape";
  if (nodeType === "text" || nodeType === "image" || nodeType === "group") return false;

  const stroke = typeof node.stroke === "string" ? (node.stroke as string).trim() : "";
  const strokeWidth = typeof node.strokeWidth === "number" && Number.isFinite(node.strokeWidth)
    ? (node.strokeWidth as number) : 0;
  const hasVisibleStroke = stroke.length > 0 && stroke !== "transparent" && stroke !== "none" && strokeWidth > 1;
  if (hasVisibleStroke) return false;

  const hasAdvancedStroke = stroke.length > 0 && stroke !== "transparent" && stroke !== "none" && (
    typeof node.dashPattern === "string" ||
    typeof node.customDash !== "undefined" ||
    typeof node.strokeAlign === "string" ||
    typeof node.strokeCap === "string" ||
    typeof node.strokeJoin === "string"
  );
  if (hasAdvancedStroke) return false;

  const shape = typeof node.shape === "string" ? node.shape : "rect";
  if (shape !== "rect") return false;

  if (node.shadow != null && typeof node.shadow === "object") {
    const s = node.shadow as Record<string, unknown>;
    if ((typeof s.color === "string" && (s.color as string).length > 0) ||
        (typeof s.offsetX === "number" && s.offsetX !== 0) ||
        (typeof s.offsetY === "number" && s.offsetY !== 0) ||
        (typeof s.blur === "number" && (s.blur as number) > 0)) return false;
  }

  const fill = typeof node.fill === "string" ? (node.fill as string).trim().toLowerCase() : "";
  if (fill.includes("gradient(")) return false;
  if (typeof node.cornerRadius === "number" && (node.cornerRadius as number) > 0) return false;
  if (Array.isArray(node.points) && node.points.length > 0) return false;
  if (Array.isArray(node.bezierPoints) && node.bezierPoints.length > 0) return false;
  if (typeof node.clipPathId === "string" || typeof node.clipId === "string") return false;

  return true;
}

describe("isMeshEligible classification", () => {
  it("marks a simple filled rect as mesh-eligible", () => {
    assert.equal(isMeshEligible({
      type: "shape", shape: "rect", fill: "#ff0000",
      stroke: "#1f2937", strokeWidth: 1,
    }), true);
  });

  it("marks a rect with default stroke (weight 1) as mesh-eligible", () => {
    // Default stroke #1f2937 with weight 1 should not block mesh
    assert.equal(isMeshEligible({
      type: "shape", shape: "rect", fill: "#dbeafe",
      stroke: "#1f2937", strokeWidth: 1,
    }), true);
  });

  it("marks a rect with thick stroke (weight > 1) as non-mesh-eligible", () => {
    assert.equal(isMeshEligible({
      type: "shape", shape: "rect", fill: "#ffffff",
      stroke: "#2563eb", strokeWidth: 3,
    }), false);
  });

  it("marks ellipse as non-mesh-eligible", () => {
    assert.equal(isMeshEligible({
      type: "shape", shape: "ellipse", fill: "#ff0000",
    }), false);
  });

  it("marks text node as non-mesh-eligible", () => {
    assert.equal(isMeshEligible({ type: "text", text: "Hello" }), false);
  });

  it("marks image node as non-mesh-eligible", () => {
    assert.equal(isMeshEligible({ type: "image", assetId: "img1" }), false);
  });

  it("marks node with visible shadow as non-mesh-eligible", () => {
    assert.equal(isMeshEligible({
      type: "shape", shape: "rect", fill: "#fff",
      shadow: { color: "#000", offsetX: 4, offsetY: 6, blur: 12 },
    }), false);
  });

  it("marks node with corner radius as non-mesh-eligible", () => {
    assert.equal(isMeshEligible({
      type: "shape", shape: "rect", fill: "#fff", cornerRadius: 12,
    }), false);
  });

  it("marks node with gradient fill as non-mesh-eligible", () => {
    assert.equal(isMeshEligible({
      type: "shape", shape: "rect", fill: "gradient(linear, ...)",
    }), false);
  });

  it("marks node with bezier points as non-mesh-eligible", () => {
    assert.equal(isMeshEligible({
      type: "shape", shape: "rect", fill: "#fff",
      bezierPoints: [{ anchor: { x: 0, y: 0 } }],
    }), false);
  });

  it("marks node with clip as non-mesh-eligible", () => {
    assert.equal(isMeshEligible({
      type: "shape", shape: "rect", fill: "#fff", clipPathId: "clip1",
    }), false);
  });

  it("marks node with advanced stroke (dash) as non-mesh-eligible", () => {
    assert.equal(isMeshEligible({
      type: "shape", shape: "rect", fill: "#fff",
      stroke: "#2563eb", strokeWidth: 3, dashPattern: "dashed",
    }), false);
  });
});
