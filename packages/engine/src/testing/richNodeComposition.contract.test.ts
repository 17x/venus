import assert from "node:assert/strict";
import test from "node:test";

import {
  applyRichNodeCanvasClip,
  applyRichNodeCanvasShadow,
  buildRichNodeEllipsePath,
  buildRichNodePath,
  buildRichNodeRoundedRectPath,
  resolveRichNodeCanvasShadow,
  resolveRichNodeCanvasTransform,
  resolveRichNodeTextFragments,
} from "../backend/adapters/richNodeComposition";

type ClipOperation =
  | ["arcTo", number, number, number, number, number]
  | ["bezierCurveTo", number, number, number, number, number, number]
  | ["beginPath"]
  | ["moveTo", number, number]
  | ["lineTo", number, number]
  | ["closePath"]
  | ["ellipse", number, number, number, number, number, number, number, boolean?]
  | ["rect", number, number, number, number]
  | ["clip", CanvasFillRule];

function createClipContext(): CanvasRenderingContext2D & { operations: ClipOperation[] } {
  const operations: ClipOperation[] = [];
  return {
    operations,
    arcTo: (x1: number, y1: number, x2: number, y2: number, radius: number) => (
      operations.push(["arcTo", x1, y1, x2, y2, radius])
    ),
    bezierCurveTo: (
      cp1x: number,
      cp1y: number,
      cp2x: number,
      cp2y: number,
      x: number,
      y: number,
    ) => operations.push(["bezierCurveTo", cp1x, cp1y, cp2x, cp2y, x, y]),
    beginPath: () => operations.push(["beginPath"]),
    moveTo: (x: number, y: number) => operations.push(["moveTo", x, y]),
    lineTo: (x: number, y: number) => operations.push(["lineTo", x, y]),
    closePath: () => operations.push(["closePath"]),
    ellipse: (
      x: number,
      y: number,
      radiusX: number,
      radiusY: number,
      rotation: number,
      startAngle: number,
      endAngle: number,
      anticlockwise?: boolean,
    ) => operations.push(["ellipse", x, y, radiusX, radiusY, rotation, startAngle, endAngle, anticlockwise]),
    rect: (x: number, y: number, width: number, height: number) => operations.push(["rect", x, y, width, height]),
    clip: (rule?: CanvasFillRule) => operations.push(["clip", rule ?? "nonzero"]),
  } as CanvasRenderingContext2D & { operations: ClipOperation[] };
}

test("rich-node composition resolves Canvas/SVG affine matrix order", () => {
  assert.deepEqual(resolveRichNodeCanvasTransform([1, 0.5, -0.25, 1, 80, 40]), {
    a: 1,
    b: 0.5,
    c: -0.25,
    d: 1,
    e: 80,
    f: 40,
  });
  assert.equal(resolveRichNodeCanvasTransform([1, 2, 3]), null);
});

test("rich-node composition resolves and applies generic shadow payloads", () => {
  const shadow = resolveRichNodeCanvasShadow({
    color: "rgba(0,0,0,0.25)",
    offsetX: 4,
    offsetY: 6,
    blur: 12,
  });
  assert.deepEqual(shadow, {
    color: "rgba(0,0,0,0.25)",
    offsetX: 4,
    offsetY: 6,
    blur: 12,
  });

  const context = {
    shadowColor: "",
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    shadowBlur: 0,
  };
  applyRichNodeCanvasShadow(context as CanvasRenderingContext2D, shadow);

  assert.equal(context.shadowColor, "rgba(0,0,0,0.25)");
  assert.equal(context.shadowOffsetX, 4);
  assert.equal(context.shadowOffsetY, 6);
  assert.equal(context.shadowBlur, 12);
});

test("rich-node composition suppresses disabled or zero-effect shadows", () => {
  assert.equal(resolveRichNodeCanvasShadow({enabled: false, offsetX: 4}), null);
  assert.equal(resolveRichNodeCanvasShadow({offsetX: 0, offsetY: 0, blur: 0}), null);
});

test("rich-node composition applies polygon clip paths", () => {
  const context = createClipContext();
  const nodeById = new Map([
    [
      "clip-polygon",
      {
        id: "clip-polygon",
        points: [
          {x: 10, y: 20},
          {x: 40, y: 20},
          {x: 30, y: 60},
        ],
      },
    ],
  ]);

  assert.equal(applyRichNodeCanvasClip(context, {id: "target", clipPathId: "clip-polygon", clipRule: "evenodd"}, nodeById), true);
  assert.deepEqual(context.operations, [
    ["beginPath"],
    ["moveTo", 10, 20],
    ["lineTo", 40, 20],
    ["lineTo", 30, 60],
    ["closePath"],
    ["clip", "evenodd"],
  ]);
});

test("rich-node composition applies ellipse clip paths", () => {
  const context = createClipContext();
  const nodeById = new Map([
    ["clip-ellipse", {id: "clip-ellipse", shape: "ellipse", x: 20, y: 30, width: 80, height: 40}],
  ]);

  assert.equal(applyRichNodeCanvasClip(context, {id: "target", clipId: "clip-ellipse"}, nodeById), true);
  assert.deepEqual(context.operations, [
    ["beginPath"],
    ["ellipse", 60, 50, 40, 20, 0, 0, Math.PI * 2, undefined],
    ["clip", "nonzero"],
  ]);
});

test("rich-node composition applies rect clip paths and ignores missing sources", () => {
  const context = createClipContext();
  const nodeById = new Map([
    ["clip-rect", {id: "clip-rect", x: 12, y: 16, width: -30, height: 44}],
  ]);

  assert.equal(applyRichNodeCanvasClip(context, {id: "missing-target", clipPathId: "missing"}, nodeById), false);
  assert.deepEqual(context.operations, []);

  assert.equal(applyRichNodeCanvasClip(context, {id: "target", clipPathId: "clip-rect"}, nodeById), true);
  assert.deepEqual(context.operations, [
    ["beginPath"],
    ["rect", 12, 16, 30, 44],
    ["clip", "nonzero"],
  ]);
});

test("rich-node composition builds per-corner rounded rectangle paths", () => {
  const context = createClipContext();

  assert.equal(
    buildRichNodeRoundedRectPath(
      context,
      {cornerRadii: {topLeft: 8, topRight: 12, bottomRight: 16, bottomLeft: 4}},
      10,
      20,
      100,
      60,
    ),
    true,
  );
  assert.deepEqual(context.operations, [
    ["beginPath"],
    ["moveTo", 18, 20],
    ["lineTo", 98, 20],
    ["arcTo", 110, 20, 110, 32, 12],
    ["lineTo", 110, 64],
    ["arcTo", 110, 80, 94, 80, 16],
    ["lineTo", 14, 80],
    ["arcTo", 10, 80, 10, 76, 4],
    ["lineTo", 10, 28],
    ["arcTo", 10, 20, 18, 20, 8],
    ["closePath"],
  ]);
});

test("rich-node composition clamps rounded rectangle radii to valid geometry", () => {
  const context = createClipContext();

  assert.equal(buildRichNodeRoundedRectPath(context, {cornerRadius: 80}, 0, 0, 40, 20), true);
  assert.deepEqual(context.operations, [
    ["beginPath"],
    ["moveTo", 10, 0],
    ["lineTo", 30, 0],
    ["arcTo", 40, 0, 40, 10, 10],
    ["lineTo", 40, 10],
    ["arcTo", 40, 20, 30, 20, 10],
    ["lineTo", 10, 20],
    ["arcTo", 0, 20, 0, 10, 10],
    ["lineTo", 0, 10],
    ["arcTo", 0, 0, 10, 0, 10],
    ["closePath"],
  ]);

  const emptyContext = createClipContext();
  assert.equal(buildRichNodeRoundedRectPath(emptyContext, {cornerRadius: 0}, 0, 0, 40, 20), false);
  assert.deepEqual(emptyContext.operations, []);
});

test("rich-node composition builds full ellipse paths", () => {
  const context = createClipContext();

  assert.equal(buildRichNodeEllipsePath(context, {}, 20, 30, 80, 40), true);
  assert.deepEqual(context.operations, [
    ["beginPath"],
    ["ellipse", 60, 50, 40, 20, 0, 0, Math.PI * 2, undefined],
  ]);
});

test("rich-node composition builds wrapped ellipse sector paths", () => {
  const context = createClipContext();

  assert.equal(
    buildRichNodeEllipsePath(context, {ellipseStartAngle: 270, ellipseEndAngle: 90}, 20, 30, 80, 40),
    true,
  );
  assert.deepEqual(context.operations, [
    ["beginPath"],
    ["moveTo", 60, 50],
    ["ellipse", 60, 50, 40, 20, 0, Math.PI * 1.5, Math.PI * 2.5, false],
    ["closePath"],
  ]);

  const emptyContext = createClipContext();
  assert.equal(buildRichNodeEllipsePath(emptyContext, {}, 20, 30, 0, 40), false);
  assert.deepEqual(emptyContext.operations, []);
});

test("rich-node composition builds point paths with explicit close policy", () => {
  const context = createClipContext();

  assert.equal(
    buildRichNodePath(
      context,
      {
        closed: false,
        points: [
          {x: 10, y: 20},
          {x: 40, y: 20},
          {x: 30, y: 60},
        ],
      },
      "polygon",
      0,
      0,
      0,
      0,
    ),
    true,
  );
  assert.deepEqual(context.operations, [
    ["beginPath"],
    ["moveTo", 10, 20],
    ["lineTo", 40, 20],
    ["lineTo", 30, 60],
  ]);
});

test("rich-node composition builds bezier paths and default closed path shapes", () => {
  const context = createClipContext();

  assert.equal(
    buildRichNodePath(
      context,
      {
        bezierPoints: [
          {anchor: {x: 0, y: 0}, cp2: {x: 10, y: 0}},
          {anchor: {x: 40, y: 30}, cp1: {x: 30, y: 30}},
        ],
      },
      "path",
      0,
      0,
      0,
      0,
    ),
    true,
  );
  assert.deepEqual(context.operations, [
    ["beginPath"],
    ["moveTo", 0, 0],
    ["bezierCurveTo", 10, 0, 30, 30, 40, 30],
    ["closePath"],
  ]);
});

test("rich-node composition builds fallback line paths and ignores unsupported empty paths", () => {
  const context = createClipContext();

  assert.equal(buildRichNodePath(context, {}, "line", 12, 16, 30, 44), true);
  assert.deepEqual(context.operations, [
    ["beginPath"],
    ["moveTo", 12, 16],
    ["lineTo", 42, 60],
  ]);

  const emptyContext = createClipContext();
  assert.equal(buildRichNodePath(emptyContext, {}, "rect", 12, 16, 30, 44), false);
  assert.deepEqual(emptyContext.operations, []);
});

test("rich-node composition resolves single-style multiline text fragments", () => {
  const fragments = resolveRichNodeTextFragments({
    text: "Hello\nWorld",
    fill: "transparent",
    x: 12,
    y: 16,
    width: 140,
    measureTextWidth: (text) => text.length * 10,
  });

  assert.deepEqual(fragments, [
    {
      text: "Hello",
      x: 12,
      y: 16,
      fill: "#0f172a",
      font: "normal 400 16px sans-serif",
      maxWidth: 140,
    },
    {
      text: "World",
      x: 12,
      y: 35.2,
      fill: "#0f172a",
      font: "normal 400 16px sans-serif",
      maxWidth: 140,
    },
  ]);
});

test("rich-node composition resolves multi-run text cursor and line advances", () => {
  const measuredFonts: string[] = [];
  const fragments = resolveRichNodeTextFragments({
    text: "fallback",
    textRuns: [
      {text: "Bold", style: {fill: "#123456", fontSize: 20, fontFamily: "Serif", fontWeight: 700}},
      {text: "\nNext", style: {fontSize: 10, lineHeight: 18}},
    ],
    fill: "#abcdef",
    x: 4,
    y: 8,
    width: 0,
    measureTextWidth: (text, font) => {
      measuredFonts.push(font);
      return text.length * 5;
    },
  });

  assert.deepEqual(fragments, [
    {
      text: "Bold",
      x: 4,
      y: 8,
      fill: "#123456",
      font: "normal 700 20px Serif",
    },
    {
      text: "Next",
      x: 4,
      y: 26,
      fill: "#abcdef",
      font: "normal 400 10px sans-serif",
    },
  ]);
  assert.deepEqual(measuredFonts, ["normal 700 20px Serif", "normal 400 10px sans-serif"]);
});
