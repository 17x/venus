/** Declares one mesh primitive emitted by native frame payload for WebGL mesh submission. */
export type WebGLNativeMeshPrimitive = {
  /** Stable mesh identifier for diagnostics correlation. */
  id: string;
  /** Optional topology token emitted by native payload. Defaults to triangles when omitted. */
  topology?: "triangles" | "lines" | "points";
  /** Packed xyz positions in world coordinates. */
  positions: readonly number[];
  /** Optional triangle indices into positions array. */
  indices?: readonly number[];
  /** Optional mesh color token in CSS notation. */
  color?: string;
};

/** Declares one payload consumed by native mesh presenter. */
export type WebGLNativeMeshPayload = {
  /** Viewport translation X in world-to-screen transform space. */
  translateX: number;
  /** Viewport translation Y in world-to-screen transform space. */
  translateY: number;
  /** Viewport scale in world-to-screen transform space. */
  scale: number;
  /** Optional ordered mesh primitives for the current frame. */
  meshes?: ReadonlyArray<WebGLNativeMeshPrimitive>;
  /** Enables native line-topology draw submission when true. */
  lineTopologySubmissionEnabled?: boolean;
};

/** Declares one cache entry for reusable WebGL mesh pipeline resources. */
export type WebGLNativeMeshPipelineCache = {
  /** Context identity owning current cached resources. */
  contextRef: WebGL2RenderingContext | WebGLRenderingContext | null;
  /** Cached linked shader program reused across mesh frames. */
  program: WebGLProgram | null;
  /** Cached vertex buffer reused for per-frame mesh uploads. */
  vertexBuffer: WebGLBuffer | null;
  /** Cached attribute location for mesh clip-space positions. */
  positionLocation: number;
  /** Cached uniform location for mesh RGBA color. */
  colorLocation: WebGLUniformLocation | null;
};

/** Declares one per-frame diagnostics snapshot for native mesh submissions. */
export type WebGLNativeMeshSubmissionDiagnostics = {
  /** Number of mesh primitives observed in the latest frame payload. */
  attemptedMeshCount: number;
  /** Number of mesh primitives that emitted draw submissions. */
  submittedMeshCount: number;
  /** Number of mesh primitives rejected before draw submission. */
  rejectedMeshCount: number;
  /** Number of rejections caused by invalid position streams. */
  rejectedMeshInvalidPositionCount: number;
  /** Number of rejections caused by invalid index streams. */
  rejectedMeshInvalidIndexCount: number;
  /** Number of rejections caused by insufficient non-indexed triangle streams. */
  rejectedMeshInsufficientStreamCount: number;
  /** Number of rejections caused by unsupported topology tokens. */
  rejectedMeshUnsupportedTopologyCount: number;
  /** Topology tokens currently supported by native WebGL mesh submission path. */
  supportedTopologies: Array<"triangles" | "lines" | "points">;
  /** Topology tokens observed in payload but rejected by native WebGL mesh submission path. */
  rejectedTopologies: Array<"triangles" | "lines" | "points">;
  /** Number of line-topology meshes observed by planning hook (submission still disabled). */
  lineTopologyPlannedCount: number;
  /** Number of line-topology meshes entering preflight validation. */
  lineTopologyPreflightAttemptedCount: number;
  /** Number of line-topology meshes passing preflight validation. */
  lineTopologyPreflightPassedCount: number;
  /** Number of line-topology meshes failing preflight validation. */
  lineTopologyPreflightRejectedCount: number;
  /** Number of line-topology preflight rejections caused by invalid position streams. */
  lineTopologyPreflightRejectedInvalidPositionCount: number;
  /** Number of line-topology preflight rejections caused by invalid index streams. */
  lineTopologyPreflightRejectedInvalidIndexCount: number;
  /** Number of line-topology preflight rejections caused by insufficient non-indexed streams. */
  lineTopologyPreflightRejectedInsufficientStreamCount: number;
  /** Number of line-topology meshes entering diagnostics-only draw-plan synthesis. */
  lineTopologyDrawPlanAttemptedCount: number;
  /** Number of synthetic line draw commands produced for diagnostics-only planning. */
  lineTopologyDrawPlanCommandCount: number;
  /** Number of line-topology meshes deferred because line submission is still disabled. */
  lineTopologySubmissionDeferredCount: number;
  /** Number of line-topology meshes reaching draw submission stage. */
  lineTopologySubmissionAttemptedCount: number;
  /** Number of line draw commands reaching submission stage as GL.LINES segments. */
  lineTopologySubmissionAttemptedCommandCount: number;
  /** Number of line-topology meshes successfully submitted as GL.LINES draws. */
  lineTopologySubmissionSucceededCount: number;
  /** Number of line draw commands successfully submitted as GL.LINES segments. */
  lineTopologySubmissionSucceededCommandCount: number;
  /** Ratio of successful line commands over attempted line commands in current frame. */
  lineTopologySubmissionCommandSuccessRate: number;
  /** Ratio of attempted line commands over draw-plan command count in current frame. */
  lineTopologySubmissionPlanCoverageRate: number;
  /** Number of planned line commands that did not end as successful submissions. */
  lineTopologySubmissionDrawPlanWastedCommandCount: number;
  /** Number of line-topology meshes failing GL.LINES submission after preflight. */
  lineTopologySubmissionFailedCount: number;
  /** Number of line draw commands that failed submission as GL.LINES segments. */
  lineTopologySubmissionFailedCommandCount: number;
  /** Number of line-topology meshes blocked because submission gate is disabled. */
  lineTopologySubmissionGateBlockedCount: number;
  /** Gate state token indicating whether line submission was enabled for this frame. */
  lineTopologySubmissionGateState: "enabled" | "disabled";
  /** Compact line-topology submission outcome token for current frame. */
  lineTopologySubmissionOutcome: "none" | "deferred-gate-disabled" | "submitted" | "failed";
  /** Number of line-topology submission failures caused by missing GL.LINES primitive token. */
  lineTopologySubmissionFailedMissingLinesPrimitiveCount: number;
  /** Number of failed line commands caused by missing GL.LINES primitive token. */
  lineTopologySubmissionFailedMissingLinesPrimitiveCommandCount: number;
  /** Number of line-topology submission failures caused by insufficient stream data. */
  lineTopologySubmissionFailedInsufficientStreamCount: number;
  /** Number of failed line commands caused by insufficient stream data. */
  lineTopologySubmissionFailedInsufficientStreamCommandCount: number;
  /** Latest line-topology submission failure reason recorded in current frame. */
  lineTopologySubmissionFailureReason: "none" | "missing-lines-primitive" | "insufficient-stream";
  /** Compact line submission failure summary tuple for telemetry exporters. */
  lineTopologySubmissionFailureSummary: {
    /** Total line submission failures observed in current frame. */
    failedCount: number;
    /** Latest line submission failure reason observed in current frame. */
    latestReason: "none" | "missing-lines-primitive" | "insufficient-stream";
    /** Histogram bucket count for missing GL.LINES primitive failures. */
    missingLinesPrimitiveCount: number;
    /** Histogram bucket count for insufficient stream failures. */
    insufficientStreamCount: number;
  };
  /** Number of meshes rejected because WebGL capability gates were not satisfied. */
  submissionCapabilityGateCount: number;
  /** Number of shader pipeline compiles performed this frame. */
  pipelineCompileCount: number;
  /** Number of shader pipeline cache reuses observed this frame. */
  pipelineReuseCount: number;
};

/**
 * Creates one empty pipeline cache used by the native mesh presenter.
 */
export function createWebGLNativeMeshPipelineCache(): WebGLNativeMeshPipelineCache {
  return {
    contextRef: null,
    program: null,
    vertexBuffer: null,
    positionLocation: -1,
    colorLocation: null,
  };
}

/**
 * Releases cached mesh pipeline resources from one context when available.
 * @param context Context currently owning cached resources.
 * @param cache Mutable pipeline cache to clear.
 */
export function disposeWebGLNativeMeshPipelineCache(
  context: WebGL2RenderingContext | WebGLRenderingContext,
  cache: WebGLNativeMeshPipelineCache,
): void {
  if (cache.program && typeof context.deleteProgram === "function") {
    context.deleteProgram(cache.program);
  }
  if (cache.vertexBuffer && typeof context.deleteBuffer === "function") {
    context.deleteBuffer(cache.vertexBuffer);
  }
  cache.contextRef = null;
  cache.program = null;
  cache.vertexBuffer = null;
  cache.positionLocation = -1;
  cache.colorLocation = null;
}

/**
 * Presents native mesh primitives directly through WebGL triangle draw calls using cached pipeline resources.
 * @param context WebGL context receiving mesh submissions.
 * @param payload Native frame payload carrying mesh primitives and viewport transform.
 * @param deviceWidth Device-pixel viewport width.
 * @param deviceHeight Device-pixel viewport height.
 * @param dpr Device pixel ratio.
 * @param cache Mutable cache storing reusable mesh shader and buffer resources.
 * @param resolveNormalizedColor Color parser converting CSS tokens into normalized channels.
 * @param allowLineTopologySubmission Enables GL.LINES submission for preflight-passed line topology payloads.
 */
export function presentNativeMeshPrimitives(
  context: WebGL2RenderingContext | WebGLRenderingContext,
  payload: WebGLNativeMeshPayload,
  deviceWidth: number,
  deviceHeight: number,
  dpr: number,
  cache: WebGLNativeMeshPipelineCache,
  resolveNormalizedColor: (color: string) => [number, number, number, number],
  allowLineTopologySubmission = false,
): WebGLNativeMeshSubmissionDiagnostics {
  const diagnostics: WebGLNativeMeshSubmissionDiagnostics = {
    attemptedMeshCount: payload.meshes?.length ?? 0,
    submittedMeshCount: 0,
    rejectedMeshCount: 0,
    rejectedMeshInvalidPositionCount: 0,
    rejectedMeshInvalidIndexCount: 0,
    rejectedMeshInsufficientStreamCount: 0,
    rejectedMeshUnsupportedTopologyCount: 0,
    supportedTopologies: ["triangles"],
    rejectedTopologies: [],
    lineTopologyPlannedCount: 0,
    lineTopologyPreflightAttemptedCount: 0,
    lineTopologyPreflightPassedCount: 0,
    lineTopologyPreflightRejectedCount: 0,
    lineTopologyPreflightRejectedInvalidPositionCount: 0,
    lineTopologyPreflightRejectedInvalidIndexCount: 0,
    lineTopologyPreflightRejectedInsufficientStreamCount: 0,
    lineTopologyDrawPlanAttemptedCount: 0,
    lineTopologyDrawPlanCommandCount: 0,
    lineTopologySubmissionDeferredCount: 0,
    lineTopologySubmissionAttemptedCount: 0,
    lineTopologySubmissionAttemptedCommandCount: 0,
    lineTopologySubmissionSucceededCount: 0,
    lineTopologySubmissionSucceededCommandCount: 0,
    lineTopologySubmissionCommandSuccessRate: 0,
    lineTopologySubmissionPlanCoverageRate: 0,
    lineTopologySubmissionDrawPlanWastedCommandCount: 0,
    lineTopologySubmissionFailedCount: 0,
    lineTopologySubmissionFailedCommandCount: 0,
    lineTopologySubmissionGateBlockedCount: 0,
    lineTopologySubmissionGateState: allowLineTopologySubmission ? "enabled" : "disabled",
    lineTopologySubmissionOutcome: "none",
    lineTopologySubmissionFailedMissingLinesPrimitiveCount: 0,
    lineTopologySubmissionFailedMissingLinesPrimitiveCommandCount: 0,
    lineTopologySubmissionFailedInsufficientStreamCount: 0,
    lineTopologySubmissionFailedInsufficientStreamCommandCount: 0,
    lineTopologySubmissionFailureReason: "none",
    lineTopologySubmissionFailureSummary: {
      failedCount: 0,
      latestReason: "none",
      missingLinesPrimitiveCount: 0,
      insufficientStreamCount: 0,
    },
    submissionCapabilityGateCount: 0,
    pipelineCompileCount: 0,
    pipelineReuseCount: 0,
  };

  if (allowLineTopologySubmission) {
    diagnostics.supportedTopologies.push("lines");
  }

  if (!payload.meshes || payload.meshes.length === 0) {
    return diagnostics;
  }
  if (
    typeof context.createShader !== "function" ||
    typeof context.shaderSource !== "function" ||
    typeof context.compileShader !== "function" ||
    typeof context.createProgram !== "function" ||
    typeof context.attachShader !== "function" ||
    typeof context.linkProgram !== "function" ||
    typeof context.useProgram !== "function" ||
    typeof context.createBuffer !== "function" ||
    typeof context.bindBuffer !== "function" ||
    typeof context.bufferData !== "function" ||
    typeof context.getAttribLocation !== "function" ||
    typeof context.enableVertexAttribArray !== "function" ||
    typeof context.vertexAttribPointer !== "function" ||
    typeof context.drawArrays !== "function" ||
    typeof context.getUniformLocation !== "function" ||
    typeof context.uniform4f !== "function" ||
    typeof context.getShaderParameter !== "function" ||
    typeof context.getProgramParameter !== "function"
  ) {
    diagnostics.rejectedMeshCount = diagnostics.attemptedMeshCount;
    diagnostics.submissionCapabilityGateCount = diagnostics.attemptedMeshCount;
    return diagnostics;
  }

  if (cache.contextRef && cache.contextRef !== context) {
    // Compatibility guard: release stale resources when adapter switches rendering contexts.
    disposeWebGLNativeMeshPipelineCache(cache.contextRef, cache);
  }

  if (!cache.program || !cache.vertexBuffer || !cache.colorLocation || cache.positionLocation < 0) {
    const isWebGL2 =
      typeof WebGL2RenderingContext !== "undefined" &&
      context instanceof WebGL2RenderingContext;
    const vertexShaderSource = isWebGL2
      ? "#version 300 es\nin vec2 aPosition; void main(){ gl_Position = vec4(aPosition, 0.0, 1.0); }"
      : "attribute vec2 aPosition; void main(){ gl_Position = vec4(aPosition, 0.0, 1.0); }";
    const fragmentShaderSource = isWebGL2
      ? "#version 300 es\nprecision mediump float; uniform vec4 uColor; out vec4 outColor; void main(){ outColor = uColor; }"
      : "precision mediump float; uniform vec4 uColor; void main(){ gl_FragColor = uColor; }";

    const vertexShader = context.createShader(context.VERTEX_SHADER);
    const fragmentShader = context.createShader(context.FRAGMENT_SHADER);
    if (!vertexShader || !fragmentShader) {
      diagnostics.rejectedMeshCount = diagnostics.attemptedMeshCount;
      diagnostics.submissionCapabilityGateCount = diagnostics.attemptedMeshCount;
      return diagnostics;
    }
    context.shaderSource(vertexShader, vertexShaderSource);
    context.compileShader(vertexShader);
    if (!context.getShaderParameter(vertexShader, context.COMPILE_STATUS)) {
      diagnostics.rejectedMeshCount = diagnostics.attemptedMeshCount;
      diagnostics.submissionCapabilityGateCount = diagnostics.attemptedMeshCount;
      return diagnostics;
    }
    context.shaderSource(fragmentShader, fragmentShaderSource);
    context.compileShader(fragmentShader);
    if (!context.getShaderParameter(fragmentShader, context.COMPILE_STATUS)) {
      diagnostics.rejectedMeshCount = diagnostics.attemptedMeshCount;
      diagnostics.submissionCapabilityGateCount = diagnostics.attemptedMeshCount;
      return diagnostics;
    }

    const program = context.createProgram();
    if (!program) {
      diagnostics.rejectedMeshCount = diagnostics.attemptedMeshCount;
      diagnostics.submissionCapabilityGateCount = diagnostics.attemptedMeshCount;
      return diagnostics;
    }
    context.attachShader(program, vertexShader);
    context.attachShader(program, fragmentShader);
    context.linkProgram(program);
    if (!context.getProgramParameter(program, context.LINK_STATUS)) {
      diagnostics.rejectedMeshCount = diagnostics.attemptedMeshCount;
      diagnostics.submissionCapabilityGateCount = diagnostics.attemptedMeshCount;
      return diagnostics;
    }
    const positionLocation = context.getAttribLocation(program, "aPosition");
    const colorLocation = context.getUniformLocation(program, "uColor");
    if (positionLocation < 0 || !colorLocation) {
      diagnostics.rejectedMeshCount = diagnostics.attemptedMeshCount;
      diagnostics.submissionCapabilityGateCount = diagnostics.attemptedMeshCount;
      return diagnostics;
    }

    const vertexBuffer = context.createBuffer();
    if (!vertexBuffer) {
      diagnostics.rejectedMeshCount = diagnostics.attemptedMeshCount;
      diagnostics.submissionCapabilityGateCount = diagnostics.attemptedMeshCount;
      return diagnostics;
    }

    cache.contextRef = context;
    cache.program = program;
    cache.vertexBuffer = vertexBuffer;
    cache.positionLocation = positionLocation;
    cache.colorLocation = colorLocation;
    diagnostics.pipelineCompileCount = 1;
  } else {
    diagnostics.pipelineReuseCount = 1;
  }

  // Mesh path should never inherit packet scissor state from previous frames.
  if (typeof context.disable === "function") {
    context.disable(context.SCISSOR_TEST);
  }

  context.useProgram(cache.program);
  context.bindBuffer(context.ARRAY_BUFFER, cache.vertexBuffer);
  context.enableVertexAttribArray(cache.positionLocation);
  context.vertexAttribPointer(cache.positionLocation, 2, context.FLOAT, false, 0, 0);

  for (const mesh of payload.meshes) {
    const topology = mesh.topology ?? "triangles";
    if (topology === "lines") {
      // Planning-only hook: capture line payload readiness before line draw submission is enabled.
      diagnostics.lineTopologyPlannedCount += 1;
      diagnostics.lineTopologyPreflightAttemptedCount += 1;
      let linePreflightPassed = false;
      let lineCommandCount = 0;
      if (!Array.isArray(mesh.positions) || mesh.positions.length < 6 || mesh.positions.length % 3 !== 0) {
        diagnostics.lineTopologyPreflightRejectedCount += 1;
        diagnostics.lineTopologyPreflightRejectedInvalidPositionCount += 1;
      } else {
        const vertexCount = Math.floor(mesh.positions.length / 3);
        if (Array.isArray(mesh.indices) && mesh.indices.length > 0) {
          const indicesAreLineCompatible = mesh.indices.length % 2 === 0;
          const indicesAreWithinBounds = mesh.indices.every((rawIndex) => {
            if (typeof rawIndex !== "number" || !Number.isFinite(rawIndex)) {
              return false;
            }
            const normalizedIndex = Math.floor(rawIndex);
            return normalizedIndex >= 0 && normalizedIndex < vertexCount;
          });
          if (!indicesAreLineCompatible || !indicesAreWithinBounds) {
            diagnostics.lineTopologyPreflightRejectedCount += 1;
            diagnostics.lineTopologyPreflightRejectedInvalidIndexCount += 1;
          } else {
            diagnostics.lineTopologyPreflightPassedCount += 1;
            linePreflightPassed = true;
            lineCommandCount = Math.floor(mesh.indices.length / 2);
          }
        } else if (vertexCount < 2 || vertexCount % 2 !== 0) {
          diagnostics.lineTopologyPreflightRejectedCount += 1;
          diagnostics.lineTopologyPreflightRejectedInsufficientStreamCount += 1;
          // Keep mesh-level rejection histogram aligned with line preflight insufficient-stream classification.
          diagnostics.rejectedMeshInsufficientStreamCount += 1;
          if (allowLineTopologySubmission) {
            // When line submission is enabled, insufficient line streams are treated as submission failures for telemetry parity.
            diagnostics.lineTopologySubmissionFailedCount += 1;
            diagnostics.lineTopologySubmissionFailedInsufficientStreamCount += 1;
            diagnostics.lineTopologySubmissionFailureReason = "insufficient-stream";
          }
        } else {
          diagnostics.lineTopologyPreflightPassedCount += 1;
          linePreflightPassed = true;
          lineCommandCount = Math.floor(vertexCount / 2);
        }
      }

      if (linePreflightPassed) {
        diagnostics.lineTopologyDrawPlanAttemptedCount += 1;
        diagnostics.lineTopologyDrawPlanCommandCount += lineCommandCount;
        if (!allowLineTopologySubmission) {
          diagnostics.lineTopologySubmissionDeferredCount += 1;
          diagnostics.lineTopologySubmissionGateBlockedCount += 1;
        }
      }

      if (linePreflightPassed && allowLineTopologySubmission) {
        diagnostics.lineTopologySubmissionAttemptedCount += 1;
        diagnostics.lineTopologySubmissionAttemptedCommandCount += lineCommandCount;
        const color = typeof mesh.color === "string" ? mesh.color : "#334155";
        const [r, g, b, a] = resolveNormalizedColor(color);
        const lineVertices: number[] = [];
        const vertexCount = Math.floor(mesh.positions.length / 3);

        const appendLineVertexByIndex = (vertexIndex: number): void => {
          const base = vertexIndex * 3;
          const worldX = mesh.positions[base] ?? 0;
          const worldY = mesh.positions[base + 1] ?? 0;
          const screenX = (worldX * payload.scale + payload.translateX) * dpr;
          const screenY = (worldY * payload.scale + payload.translateY) * dpr;
          const clipX = (screenX / deviceWidth) * 2 - 1;
          const clipY = 1 - (screenY / deviceHeight) * 2;
          lineVertices.push(clipX, clipY);
        };

        if (Array.isArray(mesh.indices) && mesh.indices.length > 0) {
          for (const rawIndex of mesh.indices) {
            appendLineVertexByIndex(Math.floor(rawIndex));
          }
        } else {
          for (let index = 0; index < vertexCount; index += 1) {
            appendLineVertexByIndex(index);
          }
        }

        const linesPrimitiveToken = typeof context.LINES === "number" ? context.LINES : null;
        if (linesPrimitiveToken === null) {
          diagnostics.lineTopologySubmissionFailedCount += 1;
          diagnostics.lineTopologySubmissionFailedCommandCount += lineCommandCount;
          diagnostics.lineTopologySubmissionFailedMissingLinesPrimitiveCount += 1;
          diagnostics.lineTopologySubmissionFailedMissingLinesPrimitiveCommandCount += lineCommandCount;
          diagnostics.lineTopologySubmissionFailureReason = "missing-lines-primitive";
          diagnostics.rejectedMeshCount += 1;
          continue;
        }
        if (lineVertices.length < 4) {
          diagnostics.lineTopologySubmissionFailedCount += 1;
          diagnostics.lineTopologySubmissionFailedCommandCount += lineCommandCount;
          diagnostics.lineTopologySubmissionFailedInsufficientStreamCount += 1;
          diagnostics.lineTopologySubmissionFailedInsufficientStreamCommandCount += lineCommandCount;
          diagnostics.lineTopologySubmissionFailureReason = "insufficient-stream";
          diagnostics.rejectedMeshCount += 1;
          diagnostics.rejectedMeshInsufficientStreamCount += 1;
          continue;
        }

        context.bufferData(context.ARRAY_BUFFER, new Float32Array(lineVertices), context.STREAM_DRAW);
        context.uniform4f(cache.colorLocation, r, g, b, a);
        context.drawArrays(linesPrimitiveToken, 0, lineVertices.length / 2);
        diagnostics.lineTopologySubmissionSucceededCount += 1;
        diagnostics.lineTopologySubmissionSucceededCommandCount += lineCommandCount;
        diagnostics.submittedMeshCount += 1;
        continue;
      }

      if (!linePreflightPassed) {
        diagnostics.rejectedMeshCount += 1;
        continue;
      }

      if (!diagnostics.rejectedTopologies.includes(topology)) {
        diagnostics.rejectedTopologies.push(topology);
      }
      diagnostics.rejectedMeshCount += 1;
      diagnostics.rejectedMeshUnsupportedTopologyCount += 1;
      continue;
    }

    if (topology !== "triangles") {
      if (!diagnostics.rejectedTopologies.includes(topology)) {
        diagnostics.rejectedTopologies.push(topology);
      }
      diagnostics.rejectedMeshCount += 1;
      diagnostics.rejectedMeshUnsupportedTopologyCount += 1;
      continue;
    }
    if (!Array.isArray(mesh.positions) || mesh.positions.length < 9 || mesh.positions.length % 3 !== 0) {
      diagnostics.rejectedMeshCount += 1;
      diagnostics.rejectedMeshInvalidPositionCount += 1;
      continue;
    }
    const color = typeof mesh.color === "string" ? mesh.color : "#334155";
    const [r, g, b, a] = resolveNormalizedColor(color);
    const vertices: number[] = [];
    const vertexCount = Math.floor(mesh.positions.length / 3);

    const appendVertexByIndex = (vertexIndex: number): void => {
      const base = vertexIndex * 3;
      const worldX = mesh.positions[base] ?? 0;
      const worldY = mesh.positions[base + 1] ?? 0;
      const screenX = (worldX * payload.scale + payload.translateX) * dpr;
      const screenY = (worldY * payload.scale + payload.translateY) * dpr;
      const clipX = (screenX / deviceWidth) * 2 - 1;
      const clipY = 1 - (screenY / deviceHeight) * 2;
      vertices.push(clipX, clipY);
    };

    if (Array.isArray(mesh.indices) && mesh.indices.length >= 3) {
      const indicesAreTriangleCompatible = mesh.indices.length % 3 === 0;
      const indicesAreWithinBounds = mesh.indices.every((rawIndex) => {
        if (typeof rawIndex !== "number" || !Number.isFinite(rawIndex)) {
          return false;
        }
        const normalizedIndex = Math.floor(rawIndex);
        return normalizedIndex >= 0 && normalizedIndex < vertexCount;
      });
      if (!indicesAreTriangleCompatible || !indicesAreWithinBounds) {
        diagnostics.rejectedMeshCount += 1;
        diagnostics.rejectedMeshInvalidIndexCount += 1;
        continue;
      }
      for (const rawIndex of mesh.indices) {
        appendVertexByIndex(Math.floor(rawIndex));
      }
    } else {
      if (mesh.positions.length % 9 !== 0) {
        diagnostics.rejectedMeshCount += 1;
        diagnostics.rejectedMeshInsufficientStreamCount += 1;
        continue;
      }
      for (let index = 0; index + 2 < mesh.positions.length; index += 3) {
        appendVertexByIndex(index / 3);
      }
    }

    if (vertices.length < 6) {
      diagnostics.rejectedMeshCount += 1;
      diagnostics.rejectedMeshInsufficientStreamCount += 1;
      continue;
    }

    context.bufferData(context.ARRAY_BUFFER, new Float32Array(vertices), context.STREAM_DRAW);
    context.uniform4f(cache.colorLocation, r, g, b, a);
    context.drawArrays(context.TRIANGLES, 0, vertices.length / 2);
    diagnostics.submittedMeshCount += 1;
  }

  diagnostics.lineTopologySubmissionFailureSummary = {
    failedCount: diagnostics.lineTopologySubmissionFailedCount,
    latestReason: diagnostics.lineTopologySubmissionFailureReason,
    missingLinesPrimitiveCount: diagnostics.lineTopologySubmissionFailedMissingLinesPrimitiveCount,
    insufficientStreamCount: diagnostics.lineTopologySubmissionFailedInsufficientStreamCount,
  };

  const attemptedLineCommands = diagnostics.lineTopologySubmissionAttemptedCommandCount;
  const succeededLineCommands = diagnostics.lineTopologySubmissionSucceededCommandCount;
  const plannedLineCommands = diagnostics.lineTopologyDrawPlanCommandCount;

  diagnostics.lineTopologySubmissionCommandSuccessRate =
    attemptedLineCommands > 0
      ? Math.max(0, Math.min(1, succeededLineCommands / attemptedLineCommands))
      : 0;
  diagnostics.lineTopologySubmissionPlanCoverageRate =
    plannedLineCommands > 0
      ? Math.max(0, Math.min(1, attemptedLineCommands / plannedLineCommands))
      : 0;
  diagnostics.lineTopologySubmissionDrawPlanWastedCommandCount = Math.max(
    0,
    plannedLineCommands - succeededLineCommands,
  );

  // Normalize a single outcome token so telemetry does not need to infer terminal line submission state from counters.
  if (diagnostics.lineTopologySubmissionFailedCount > 0) {
    diagnostics.lineTopologySubmissionOutcome = "failed";
  } else if (diagnostics.lineTopologySubmissionSucceededCount > 0) {
    diagnostics.lineTopologySubmissionOutcome = "submitted";
  } else if (diagnostics.lineTopologySubmissionGateBlockedCount > 0) {
    diagnostics.lineTopologySubmissionOutcome = "deferred-gate-disabled";
  }

  return diagnostics;
}
