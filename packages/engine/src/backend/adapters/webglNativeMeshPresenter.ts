import type { EngineMaterialEntity } from "../../orchestration/api/public-types/material.types";
import type { EngineLightEntity } from "../../orchestration/api/public-types/lighting.types";

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
  /** Optional packed uv coordinates as [u,v, ...]. */
  uvs?: readonly number[];
  /** Optional mesh color token in CSS notation. */
  color?: string;
  /** Optional material id used for material texture binding. */
  materialId?: string;
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
  /** Optional material registry referenced by mesh primitives. */
  materials?: ReadonlyArray<EngineMaterialEntity>;
  /** Optional ordered light entities consumed by native mesh shading and diagnostics. */
  lights?: ReadonlyArray<EngineLightEntity>;
  /** Optional shared 3D camera packet used to project world xyz into clip space. */
  camera3d?: {
    yaw: number;
    pitch: number;
    distance: number;
    targetX: number;
    targetY: number;
    targetZ: number;
    perspectiveFovY: number;
    near: number;
    far: number;
    projectionMode: "perspective" | "orthographic";
  };
  /** Enables native line-topology draw submission when true. */
  lineTopologySubmissionEnabled?: boolean;
};

type WebGLNativeTextureCacheEntry = {
  texture: WebGLTexture;
  sourceUri: string;
  state: "placeholder" | "loading" | "ready" | "uploaded" | "failed";
  image: TexImageSource | null;
  width: number;
  height: number;
};

/** Declares one cache entry for reusable WebGL mesh pipeline resources. */
export type WebGLNativeMeshPipelineCache = {
  /** Context identity owning current cached resources. */
  contextRef: WebGL2RenderingContext | WebGLRenderingContext | null;
  /** Cached linked shader program reused across mesh frames. */
  program: WebGLProgram | null;
  /** Cached vertex buffer reused for per-frame mesh uploads. */
  vertexBuffer: WebGLBuffer | null;
  /** Cached UV buffer reused for per-frame textured mesh uploads. */
  uvBuffer: WebGLBuffer | null;
  /** Cached texture entries keyed by material texture URI. */
  textureCache: Map<string, WebGLNativeTextureCacheEntry>;
  /** Cached attribute location for mesh clip-space positions. */
  positionLocation: number;
  /** Cached attribute location for mesh UV coordinates. */
  uvLocation: number;
  /** Cached uniform location for mesh RGBA color. */
  colorLocation: WebGLUniformLocation | null;
  /** Cached uniform location for enabling texture sampling. */
  useTextureLocation: WebGLUniformLocation | null;
  /** Cached uniform location for texture sampler binding. */
  textureLocation: WebGLUniformLocation | null;
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
  /** Compact line-topology submission efficiency summary tuple so telemetry can consume a stable shape without recomputation. */
  lineTopologySubmissionEfficiencySummary: {
    /** Ratio of successful line commands over attempted line commands in current frame (0–1). */
    commandSuccessRate: number;
    /** Ratio of attempted line commands over draw-plan command count in current frame (0–1). */
    planCoverageRate: number;
    /** Number of planned line commands that did not end as successful submissions. */
    drawPlanWastedCommandCount: number;
  };
  /** Number of meshes rejected because WebGL capability gates were not satisfied. */
  submissionCapabilityGateCount: number;
  /** Number of shader pipeline compiles performed this frame. */
  pipelineCompileCount: number;
  /** Number of shader pipeline cache reuses observed this frame. */
  pipelineReuseCount: number;
  /** Number of active runtime lights observed in current frame payload. */
  activeLightCount: number;
  /** Number of mesh/material pairs carrying texture references. */
  materialTextureCandidateCount: number;
  /** Number of texture candidates that also carry usable UV streams. */
  materialTextureUvReadyCount: number;
  /** Number of material textures bound by the native mesh path. */
  materialTextureBindingCount: number;
  /** Estimated bytes uploaded for native material textures in current frame. */
  materialTextureUploadBytes: number;
  /** Number of native material texture cache hits in current frame. */
  materialTextureCacheHitCount: number;
  /** Number of native material texture cache misses in current frame. */
  materialTextureCacheMissCount: number;
  /** Number of native material texture decode failures observed in current frame. */
  materialTextureDecodeFailureCount: number;
  /** Latest material texture decode failure reason. */
  materialTextureDecodeFailureReason: "none" | "image-load-failed";
  /** Latest texture binding fallback reason for current frame. */
  materialTextureFallbackReason: "none" | "missing-material" | "missing-uv" | "texture-upload-not-implemented" | "decode-failed";
};

const POSITION_COMPONENT_STRIDE = 3;
const INDEX_PAIR_STRIDE = 2;
const TRIANGLE_INDEX_STRIDE = 3;
const MIN_LINE_POSITION_COMPONENTS = 6;
const MIN_TRIANGLE_POSITION_COMPONENTS = 9;
const MIN_LINE_VERTEX_COUNT = 2;
const MIN_LINE_CLIP_COMPONENTS = 6;
const MIN_TRIANGLE_CLIP_COMPONENTS = 9;
const VERTEX_COORD_COMPONENTS = 3;
const CAMERA_UP_X = 0;
const CAMERA_UP_Y = 1;
const CAMERA_UP_Z = 0;
const CAMERA_EPSILON = 0.0001;
const LIGHTING_FACTOR_MIN = 0.08;
const LIGHTING_FACTOR_MAX = 1.65;
const DIRECTIONAL_LIGHT_GAIN = 0.9;
const POINT_LIGHT_GAIN = 1.25;
const SPOT_LIGHT_GAIN = 1.15;
const HEMISPHERE_LIGHT_GAIN = 0.85;
const MATERIAL_TEXTURE_PLACEHOLDER_BYTES = 4;

type ProjectedPoint = { clipX: number; clipY: number; clipZ: number; depth: number; visible: boolean };
type Vec3 = { x: number; y: number; z: number };
type RgbFactor = { r: number; g: number; b: number };

function normalize3(x: number, y: number, z: number): Vec3 {
  const len = Math.hypot(x, y, z);
  if (len <= CAMERA_EPSILON) {
    return { x: 0, y: 0, z: 1 };
  }
  return { x: x / len, y: y / len, z: z / len };
}

function cross3(
  ax: number,
  ay: number,
  az: number,
  bx: number,
  by: number,
  bz: number,
): Vec3 {
  return {
    x: ay * bz - az * by,
    y: az * bx - ax * bz,
    z: ax * by - ay * bx,
  };
}

function dot3(
  ax: number,
  ay: number,
  az: number,
  bx: number,
  by: number,
  bz: number,
): number {
  return ax * bx + ay * by + az * bz;
}

function clampUnit(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function clampLightingFactor(value: number): number {
  return Math.max(LIGHTING_FACTOR_MIN, Math.min(LIGHTING_FACTOR_MAX, value));
}

function resolveLightColorFactor(
  light: EngineLightEntity,
  resolveNormalizedColor: (color: string) => [number, number, number, number],
): RgbFactor {
  const [r, g, b] = resolveNormalizedColor(light.color);
  return { r, g, b };
}

function addScaledLight(target: RgbFactor, color: RgbFactor, amount: number): void {
  if (!Number.isFinite(amount) || amount <= 0) {
    return;
  }
  target.r += color.r * amount;
  target.g += color.g * amount;
  target.b += color.b * amount;
}

function resolveMeshCentroidAndNormal(mesh: WebGLNativeMeshPrimitive): { center: Vec3; normal: Vec3 } {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let minZ = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  let maxZ = Number.NEGATIVE_INFINITY;
  const vertexCount = Math.floor(mesh.positions.length / POSITION_COMPONENT_STRIDE);
  for (let index = 0; index < vertexCount; index += 1) {
    const base = index * POSITION_COMPONENT_STRIDE;
    const x = mesh.positions[base] ?? 0;
    const y = mesh.positions[base + 1] ?? 0;
    const z = mesh.positions[base + 2] ?? 0;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    minZ = Math.min(minZ, z);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
    maxZ = Math.max(maxZ, z);
  }
  const rangeX = Number.isFinite(maxX - minX) ? maxX - minX : 0;
  const rangeY = Number.isFinite(maxY - minY) ? maxY - minY : 0;
  const rangeZ = Number.isFinite(maxZ - minZ) ? maxZ - minZ : 0;
  const center = {
    x: Number.isFinite(minX + maxX) ? (minX + maxX) * 0.5 : 0,
    y: Number.isFinite(minY + maxY) ? (minY + maxY) * 0.5 : 0,
    z: Number.isFinite(minZ + maxZ) ? (minZ + maxZ) * 0.5 : 0,
  };
  if (rangeY <= Math.max(CAMERA_EPSILON, Math.min(rangeX, rangeZ) * 0.08)) {
    return { center, normal: { x: 0, y: 1, z: 0 } };
  }

  const resolvePosition = (vertexIndex: number): Vec3 => {
    const base = vertexIndex * POSITION_COMPONENT_STRIDE;
    return {
      x: mesh.positions[base] ?? 0,
      y: mesh.positions[base + 1] ?? 0,
      z: mesh.positions[base + 2] ?? 0,
    };
  };
  const indices = Array.isArray(mesh.indices) && mesh.indices.length >= TRIANGLE_INDEX_STRIDE
    ? mesh.indices
    : undefined;
  const triangleCount = indices
    ? Math.floor(indices.length / TRIANGLE_INDEX_STRIDE)
    : Math.floor(vertexCount / TRIANGLE_INDEX_STRIDE);
  for (let triangleIndex = 0; triangleIndex < triangleCount; triangleIndex += 1) {
    const aIndex = indices ? Math.floor(indices[triangleIndex * TRIANGLE_INDEX_STRIDE] ?? 0) : triangleIndex * TRIANGLE_INDEX_STRIDE;
    const bIndex = indices ? Math.floor(indices[triangleIndex * TRIANGLE_INDEX_STRIDE + 1] ?? 0) : triangleIndex * TRIANGLE_INDEX_STRIDE + 1;
    const cIndex = indices ? Math.floor(indices[triangleIndex * TRIANGLE_INDEX_STRIDE + 2] ?? 0) : triangleIndex * TRIANGLE_INDEX_STRIDE + 2;
    if (aIndex < 0 || bIndex < 0 || cIndex < 0 || aIndex >= vertexCount || bIndex >= vertexCount || cIndex >= vertexCount) {
      continue;
    }
    const a = resolvePosition(aIndex);
    const b = resolvePosition(bIndex);
    const c = resolvePosition(cIndex);
    const ab = { x: b.x - a.x, y: b.y - a.y, z: b.z - a.z };
    const ac = { x: c.x - a.x, y: c.y - a.y, z: c.z - a.z };
    const rawNormal = cross3(ab.x, ab.y, ab.z, ac.x, ac.y, ac.z);
    if (Math.hypot(rawNormal.x, rawNormal.y, rawNormal.z) > CAMERA_EPSILON) {
      return { center, normal: normalize3(rawNormal.x, rawNormal.y, rawNormal.z) };
    }
  }
  return { center, normal: { x: 0, y: 1, z: 0 } };
}

function projectWorldToClip(
  worldX: number,
  worldY: number,
  worldZ: number,
  payload: WebGLNativeMeshPayload,
  deviceWidth: number,
  deviceHeight: number,
  dpr: number,
): ProjectedPoint {
  const camera = payload.camera3d;
  if (!camera) {
    const screenX = (worldX * payload.scale + payload.translateX) * dpr;
    const screenY = (worldY * payload.scale + payload.translateY) * dpr;
    return {
      clipX: (screenX / deviceWidth) * INDEX_PAIR_STRIDE - 1,
      clipY: 1 - (screenY / deviceHeight) * INDEX_PAIR_STRIDE,
      clipZ: 0,
      depth: worldZ,
      visible: true,
    };
  }

  const yaw = (camera.yaw * Math.PI) / 180;
  const pitch = (camera.pitch * Math.PI) / 180;
  const cosYaw = Math.cos(yaw);
  const sinYaw = Math.sin(yaw);
  const cosPitch = Math.cos(pitch);
  const sinPitch = Math.sin(pitch);

  const cameraX = camera.targetX + camera.distance * sinYaw * cosPitch;
  const cameraY = camera.targetY - camera.distance * sinPitch;
  const cameraZ = camera.targetZ + camera.distance * cosYaw * cosPitch;

  const forwardRawX = camera.targetX - cameraX;
  const forwardRawY = camera.targetY - cameraY;
  const forwardRawZ = camera.targetZ - cameraZ;
  const forward = normalize3(forwardRawX, forwardRawY, forwardRawZ);
  const rightRaw = cross3(CAMERA_UP_X, CAMERA_UP_Y, CAMERA_UP_Z, forward.x, forward.y, forward.z);
  const right = normalize3(rightRaw.x, rightRaw.y, rightRaw.z);
  const upRaw = cross3(forward.x, forward.y, forward.z, right.x, right.y, right.z);
  const up = normalize3(upRaw.x, upRaw.y, upRaw.z);

  const relX = worldX - cameraX;
  const relY = worldY - cameraY;
  const relZ = worldZ - cameraZ;
  const viewX = dot3(relX, relY, relZ, right.x, right.y, right.z);
  const viewY = dot3(relX, relY, relZ, up.x, up.y, up.z);
  const viewZ = dot3(relX, relY, relZ, forward.x, forward.y, forward.z);

  const aspect = deviceHeight > 0 ? deviceWidth / deviceHeight : 1;
  if (camera.projectionMode === "orthographic") {
    if (viewZ <= camera.near + CAMERA_EPSILON || viewZ >= camera.far) {
      return {
        clipX: 0,
        clipY: 0,
        clipZ: 2,
        depth: viewZ,
        visible: false,
      };
    }
    const halfSize = Math.max(1, camera.distance * 0.75);
    const depth01 = Math.max(0, Math.min(1, (viewZ - camera.near) / Math.max(CAMERA_EPSILON, camera.far - camera.near)));
    return {
      clipX: Math.max(-2, Math.min(2, viewX / (halfSize * aspect))),
      clipY: Math.max(-2, Math.min(2, viewY / halfSize)),
      clipZ: depth01 * 2 - 1,
      depth: viewZ,
      visible: true,
    };
  }

  if (viewZ <= camera.near + CAMERA_EPSILON || viewZ >= camera.far) {
    return {
      clipX: 0,
      clipY: 0,
      clipZ: 2,
      depth: viewZ,
      visible: false,
    };
  }

  const clampedViewZ = viewZ;
  const tanHalfFov = Math.tan((camera.perspectiveFovY * Math.PI / 180) * 0.5);
  const clipX = viewX / (clampedViewZ * tanHalfFov * Math.max(CAMERA_EPSILON, aspect));
  const clipY = viewY / (clampedViewZ * tanHalfFov);
  return {
    clipX: Math.max(-4, Math.min(4, clipX)),
    clipY: Math.max(-4, Math.min(4, clipY)),
    clipZ: Math.max(-1, Math.min(1, (((clampedViewZ - camera.near) / Math.max(CAMERA_EPSILON, camera.far - camera.near)) * 2) - 1)),
    depth: viewZ,
    visible: true,
  };
}

function resolveMeshLightingFactor(
  payload: WebGLNativeMeshPayload,
  mesh: WebGLNativeMeshPrimitive,
  resolveNormalizedColor: (color: string) => [number, number, number, number],
): RgbFactor {
  const lights = Array.isArray(payload.lights) ? payload.lights : [];
  if (lights.length === 0) {
    return { r: 1, g: 1, b: 1 };
  }

  const { center, normal } = resolveMeshCentroidAndNormal(mesh);
  const factor: RgbFactor = { r: LIGHTING_FACTOR_MIN, g: LIGHTING_FACTOR_MIN, b: LIGHTING_FACTOR_MIN };
  for (const light of lights) {
    const intensity = Math.max(0, Number.isFinite(light.intensity) ? light.intensity : 1);
    if (intensity <= 0) {
      continue;
    }
    const color = resolveLightColorFactor(light, resolveNormalizedColor);
    if (light.type === "ambient") {
      addScaledLight(factor, color, intensity);
      continue;
    }
    if (light.type === "hemisphere") {
      const groundColor = resolveNormalizedColor(light.groundColor);
      const skyWeight = clampUnit(normal.y * 0.5 + 0.5);
      const blended = {
        r: color.r * skyWeight + groundColor[0] * (1 - skyWeight),
        g: color.g * skyWeight + groundColor[1] * (1 - skyWeight),
        b: color.b * skyWeight + groundColor[2] * (1 - skyWeight),
      };
      addScaledLight(factor, blended, intensity * HEMISPHERE_LIGHT_GAIN);
      continue;
    }
    if (light.type === "directional") {
      const directionToLight = normalize3(-light.targetX, -light.targetY, -light.targetZ);
      const surfaceFactor = Math.max(0, dot3(normal.x, normal.y, normal.z, directionToLight.x, directionToLight.y, directionToLight.z));
      addScaledLight(factor, color, intensity * DIRECTIONAL_LIGHT_GAIN * surfaceFactor);
      continue;
    }
    if (light.type === "point" || light.type === "spot") {
      const toLight = normalize3(light.positionX - center.x, light.positionY - center.y, light.positionZ - center.z);
      const distance = Math.hypot(light.positionX - center.x, light.positionY - center.y, light.positionZ - center.z);
      const rangeFactor = light.distance > 0
        ? Math.max(0, 1 - distance / Math.max(CAMERA_EPSILON, light.distance))
        : 1;
      const attenuation = Math.pow(rangeFactor, Math.max(0.5, light.decay || 1));
      const surfaceFactor = Math.max(0, dot3(normal.x, normal.y, normal.z, toLight.x, toLight.y, toLight.z));
      if (light.type === "spot") {
        const spotAxis = normalize3(light.targetX - light.positionX, light.targetY - light.positionY, light.targetZ - light.positionZ);
        const pointToSurface = normalize3(center.x - light.positionX, center.y - light.positionY, center.z - light.positionZ);
        const coneCos = Math.cos(light.angle);
        const spotCos = dot3(spotAxis.x, spotAxis.y, spotAxis.z, pointToSurface.x, pointToSurface.y, pointToSurface.z);
        const penumbraWidth = Math.max(CAMERA_EPSILON, Math.abs(1 - coneCos) * Math.max(0, Math.min(1, light.penumbra)));
        const coneFactor = clampUnit((spotCos - coneCos) / penumbraWidth);
        addScaledLight(factor, color, intensity * SPOT_LIGHT_GAIN * attenuation * surfaceFactor * coneFactor);
      } else {
        addScaledLight(factor, color, intensity * POINT_LIGHT_GAIN * attenuation * surfaceFactor);
      }
    }
  }
  return {
    r: clampLightingFactor(factor.r),
    g: clampLightingFactor(factor.g),
    b: clampLightingFactor(factor.b),
  };
}

function resolveMaterialBaseColorTexture(material: EngineMaterialEntity | undefined): string | undefined {
  if (!material) {
    return undefined;
  }
  if ((material.type === "pbr" || material.type === "unlit") && typeof material.baseColorTexture === "string") {
    return material.baseColorTexture.length > 0 ? material.baseColorTexture : undefined;
  }
  return undefined;
}

function resolveMeshMaterialTextureBinding(
  payload: WebGLNativeMeshPayload,
  mesh: WebGLNativeMeshPrimitive,
): {
  textureKey: string;
  sampler?: Extract<EngineMaterialEntity, { type: "pbr" | "unlit" }>["baseColorTextureSampler"];
} | undefined {
  if (!mesh.materialId) {
    return undefined;
  }
  const material = (payload.materials ?? []).find((item) => item.id === mesh.materialId);
  const textureKey = resolveMaterialBaseColorTexture(material);
  if (!textureKey) {
    return undefined;
  }
  if (material?.type === "pbr" || material?.type === "unlit") {
    return {
      textureKey,
      sampler: material.baseColorTextureSampler,
    };
  }
  return { textureKey };
}

function applyMaterialTexturePreflight(
  payload: WebGLNativeMeshPayload,
  diagnostics: WebGLNativeMeshSubmissionDiagnostics,
): void {
  const materialMap = new Map((payload.materials ?? []).map((material) => [material.id, material]));
  for (const mesh of payload.meshes ?? []) {
    if (!mesh.materialId) {
      continue;
    }
    const material = materialMap.get(mesh.materialId);
    if (!material) {
      diagnostics.materialTextureFallbackReason = "missing-material";
      continue;
    }
    if (!resolveMaterialBaseColorTexture(material)) {
      continue;
    }
    diagnostics.materialTextureCandidateCount += 1;
    const vertexCount = Math.floor(mesh.positions.length / POSITION_COMPONENT_STRIDE);
    const uvReady = Array.isArray(mesh.uvs) && mesh.uvs.length >= vertexCount * 2;
    if (!uvReady) {
      diagnostics.materialTextureFallbackReason = "missing-uv";
      continue;
    }
    diagnostics.materialTextureUvReadyCount += 1;
    diagnostics.materialTextureFallbackReason = "texture-upload-not-implemented";
  }
}

function createPlaceholderTexture(
  context: WebGL2RenderingContext | WebGLRenderingContext,
  sampler?: Extract<EngineMaterialEntity, { type: "pbr" | "unlit" }>["baseColorTextureSampler"],
): WebGLTexture | null {
  if (
    typeof context.createTexture !== "function" ||
    typeof context.bindTexture !== "function" ||
    typeof context.texImage2D !== "function" ||
    typeof context.texParameteri !== "function"
  ) {
    return null;
  }
  const texture = context.createTexture();
  if (!texture) {
    return null;
  }
  context.bindTexture(context.TEXTURE_2D, texture);
  const pixel = new Uint8Array([255, 255, 255, 255]);
  context.texImage2D(
    context.TEXTURE_2D,
    0,
    context.RGBA,
    1,
    1,
    0,
    context.RGBA,
    context.UNSIGNED_BYTE,
    pixel,
  );
  const wrapS = sampler?.wrapS === "repeat"
    ? context.REPEAT
    : sampler?.wrapS === "mirrored-repeat"
      ? context.MIRRORED_REPEAT
      : context.CLAMP_TO_EDGE;
  const wrapT = sampler?.wrapT === "repeat"
    ? context.REPEAT
    : sampler?.wrapT === "mirrored-repeat"
      ? context.MIRRORED_REPEAT
      : context.CLAMP_TO_EDGE;
  const minFilter = sampler?.minFilter === "nearest" ? context.NEAREST : context.LINEAR;
  const magFilter = sampler?.magFilter === "nearest" ? context.NEAREST : context.LINEAR;
  context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MIN_FILTER, minFilter);
  context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MAG_FILTER, magFilter);
  context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_S, wrapS);
  context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_T, wrapT);
  return texture;
}

function startImageTextureDecode(sourceUri: string, entry: WebGLNativeTextureCacheEntry): void {
  if (entry.state !== "placeholder") {
    return;
  }
  const imageCtor = (globalThis as { Image?: new () => HTMLImageElement }).Image;
  if (typeof imageCtor !== "function") {
    return;
  }
  entry.state = "loading";
  const image = new imageCtor();
  image.crossOrigin = "anonymous";
  image.onload = () => {
    entry.image = image;
    entry.width = Math.max(1, Number.isFinite(image.width) ? image.width : 1);
    entry.height = Math.max(1, Number.isFinite(image.height) ? image.height : 1);
    entry.state = "ready";
  };
  image.onerror = () => {
    entry.state = "failed";
  };
  image.src = sourceUri;
}

function bindMaterialTexture(
  context: WebGL2RenderingContext | WebGLRenderingContext,
  cache: WebGLNativeMeshPipelineCache,
  textureKey: string | undefined,
  sampler?: Extract<EngineMaterialEntity, { type: "pbr" | "unlit" }>["baseColorTextureSampler"],
): {
  bound: boolean;
  uploadedBytes: number;
  cacheHit: boolean;
  cacheMiss: boolean;
  decodeFailed: boolean;
} {
  if (!textureKey || !cache.textureLocation || !cache.useTextureLocation || cache.uvLocation < 0 || !cache.uvBuffer) {
    return { bound: false, uploadedBytes: 0, cacheHit: false, cacheMiss: false, decodeFailed: false };
  }
  if (
    typeof context.activeTexture !== "function" ||
    typeof context.bindTexture !== "function" ||
    typeof context.uniform1i !== "function" ||
    typeof context.uniform1f !== "function"
  ) {
    return { bound: false, uploadedBytes: 0, cacheHit: false, cacheMiss: false, decodeFailed: false };
  }
  let texture = cache.textureCache.get(textureKey);
  let uploadedBytes = 0;
  let cacheHit = true;
  let cacheMiss = false;
  if (!texture) {
    cacheHit = false;
    cacheMiss = true;
    const placeholderTexture = createPlaceholderTexture(context, sampler) ?? undefined;
    if (!placeholderTexture) {
      return { bound: false, uploadedBytes: 0, cacheHit: false, cacheMiss: true, decodeFailed: false };
    }
    uploadedBytes = MATERIAL_TEXTURE_PLACEHOLDER_BYTES;
    texture = {
      texture: placeholderTexture,
      sourceUri: textureKey,
      state: "placeholder",
      image: null,
      width: 1,
      height: 1,
    };
    cache.textureCache.set(textureKey, texture);
    startImageTextureDecode(textureKey, texture);
  } else if (texture.state === "ready" && texture.image) {
    context.bindTexture(context.TEXTURE_2D, texture.texture);
    context.texImage2D(
      context.TEXTURE_2D,
      0,
      context.RGBA,
      context.RGBA,
      context.UNSIGNED_BYTE,
      texture.image,
    );
    uploadedBytes = Math.max(MATERIAL_TEXTURE_PLACEHOLDER_BYTES, texture.width * texture.height * 4);
    texture.state = "uploaded";
  }
  context.activeTexture(context.TEXTURE0);
  context.bindTexture(context.TEXTURE_2D, texture.texture);
  context.uniform1i(cache.textureLocation, 0);
  context.uniform1f(cache.useTextureLocation, 1);
  return { bound: true, uploadedBytes, cacheHit, cacheMiss, decodeFailed: texture.state === "failed" };
}

/**
 * Creates one empty pipeline cache used by the native mesh presenter.
 */
export function createWebGLNativeMeshPipelineCache(): WebGLNativeMeshPipelineCache {
  return {
    contextRef: null,
    program: null,
    vertexBuffer: null,
    uvBuffer: null,
    textureCache: new Map(),
    positionLocation: -1,
    uvLocation: -1,
    colorLocation: null,
    useTextureLocation: null,
    textureLocation: null,
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
  if (cache.uvBuffer && typeof context.deleteBuffer === "function") {
    context.deleteBuffer(cache.uvBuffer);
  }
  if (typeof context.deleteTexture === "function") {
    for (const entry of cache.textureCache.values()) {
      context.deleteTexture(entry.texture);
    }
  }
  cache.contextRef = null;
  cache.program = null;
  cache.vertexBuffer = null;
  cache.uvBuffer = null;
  cache.textureCache.clear();
  cache.positionLocation = -1;
  cache.uvLocation = -1;
  cache.colorLocation = null;
  cache.useTextureLocation = null;
  cache.textureLocation = null;
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
    lineTopologySubmissionEfficiencySummary: {
      commandSuccessRate: 0,
      planCoverageRate: 0,
      drawPlanWastedCommandCount: 0,
    },
    submissionCapabilityGateCount: 0,
    pipelineCompileCount: 0,
    pipelineReuseCount: 0,
    activeLightCount: payload.lights?.length ?? 0,
    materialTextureCandidateCount: 0,
    materialTextureUvReadyCount: 0,
    materialTextureBindingCount: 0,
    materialTextureUploadBytes: 0,
    materialTextureCacheHitCount: 0,
    materialTextureCacheMissCount: 0,
    materialTextureDecodeFailureCount: 0,
    materialTextureDecodeFailureReason: "none",
    materialTextureFallbackReason: "none",
  };
  applyMaterialTexturePreflight(payload, diagnostics);
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

  if (!cache.program || !cache.vertexBuffer || !cache.uvBuffer || !cache.colorLocation || cache.positionLocation < 0) {
    const isWebGL2 =
      typeof WebGL2RenderingContext !== "undefined" &&
      context instanceof WebGL2RenderingContext;
    const vertexShaderSource = isWebGL2
      ? "#version 300 es\nin vec3 aPosition; in vec2 aUv; out vec2 vUv; void main(){ vUv = aUv; gl_Position = vec4(aPosition, 1.0); }"
      : "attribute vec3 aPosition; attribute vec2 aUv; varying vec2 vUv; void main(){ vUv = aUv; gl_Position = vec4(aPosition, 1.0); }";
    const fragmentShaderSource = isWebGL2
      ? "#version 300 es\nprecision mediump float; in vec2 vUv; uniform vec4 uColor; uniform sampler2D uTexture; uniform float uUseTexture; out vec4 outColor; void main(){ vec4 tex = texture(uTexture, vUv); outColor = uUseTexture > 0.5 ? tex * uColor : uColor; }"
      : "precision mediump float; varying vec2 vUv; uniform vec4 uColor; uniform sampler2D uTexture; uniform float uUseTexture; void main(){ vec4 tex = texture2D(uTexture, vUv); gl_FragColor = uUseTexture > 0.5 ? tex * uColor : uColor; }";

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
    const uvLocation = context.getAttribLocation(program, "aUv");
    const colorLocation = context.getUniformLocation(program, "uColor");
    const useTextureLocation = context.getUniformLocation(program, "uUseTexture");
    const textureLocation = context.getUniformLocation(program, "uTexture");
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
    const uvBuffer = context.createBuffer();
    if (!uvBuffer) {
      diagnostics.rejectedMeshCount = diagnostics.attemptedMeshCount;
      diagnostics.submissionCapabilityGateCount = diagnostics.attemptedMeshCount;
      return diagnostics;
    }

    cache.contextRef = context;
    cache.program = program;
    cache.vertexBuffer = vertexBuffer;
    cache.uvBuffer = uvBuffer;
    cache.positionLocation = positionLocation;
    cache.uvLocation = uvLocation;
    cache.colorLocation = colorLocation;
    cache.useTextureLocation = useTextureLocation;
    cache.textureLocation = textureLocation;
    diagnostics.pipelineCompileCount = 1;
  } else {
    diagnostics.pipelineReuseCount = 1;
  }

  // Mesh path should never inherit packet scissor state from previous frames.
  if (typeof context.disable === "function") {
    context.disable(context.SCISSOR_TEST);
  }

  context.useProgram(cache.program);
  if (typeof context.enable === "function" && typeof context.blendFunc === "function") {
    context.enable(context.BLEND);
    context.blendFunc(context.SRC_ALPHA, context.ONE_MINUS_SRC_ALPHA);
  }
  context.bindBuffer(context.ARRAY_BUFFER, cache.vertexBuffer);
  context.enableVertexAttribArray(cache.positionLocation);
  context.vertexAttribPointer(
    cache.positionLocation,
    VERTEX_COORD_COMPONENTS,
    context.FLOAT,
    false,
    0,
    0,
  );

  for (const mesh of payload.meshes) {
    const topology = mesh.topology ?? "triangles";
    if (topology === "lines") {
      // Planning-only hook: capture line payload readiness before line draw submission is enabled.
      diagnostics.lineTopologyPlannedCount += 1;
      diagnostics.lineTopologyPreflightAttemptedCount += 1;
      let linePreflightPassed = false;
      let lineCommandCount = 0;
      if (
        !Array.isArray(mesh.positions)
        || mesh.positions.length < MIN_LINE_POSITION_COMPONENTS
        || mesh.positions.length % POSITION_COMPONENT_STRIDE !== 0
      ) {
        diagnostics.lineTopologyPreflightRejectedCount += 1;
        diagnostics.lineTopologyPreflightRejectedInvalidPositionCount += 1;
      } else {
        const vertexCount = Math.floor(mesh.positions.length / POSITION_COMPONENT_STRIDE);
        if (Array.isArray(mesh.indices) && mesh.indices.length > 0) {
          const indicesAreLineCompatible = mesh.indices.length % INDEX_PAIR_STRIDE === 0;
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
            lineCommandCount = Math.floor(mesh.indices.length / INDEX_PAIR_STRIDE);
          }
        } else if (vertexCount < MIN_LINE_VERTEX_COUNT || vertexCount % INDEX_PAIR_STRIDE !== 0) {
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
          lineCommandCount = Math.floor(vertexCount / INDEX_PAIR_STRIDE);
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
        const lightingFactor = resolveMeshLightingFactor(payload, mesh, resolveNormalizedColor);
        const lineVertices: number[] = [];
        const vertexCount = Math.floor(mesh.positions.length / POSITION_COMPONENT_STRIDE);

        const projectVertexByIndex = (vertexIndex: number): ProjectedPoint => {
          const base = vertexIndex * POSITION_COMPONENT_STRIDE;
          const worldX = mesh.positions[base] ?? 0;
          const worldY = mesh.positions[base + 1] ?? 0;
          const worldZ = mesh.positions[base + 2] ?? 0;
          return projectWorldToClip(worldX, worldY, worldZ, payload, deviceWidth, deviceHeight, dpr);
        };

        if (Array.isArray(mesh.indices) && mesh.indices.length > 0) {
          for (let index = 0; index + 1 < mesh.indices.length; index += INDEX_PAIR_STRIDE) {
            const a = projectVertexByIndex(Math.floor(mesh.indices[index] ?? 0));
            const b = projectVertexByIndex(Math.floor(mesh.indices[index + 1] ?? 0));
            if (!a.visible || !b.visible) {
              continue;
            }
            lineVertices.push(a.clipX, a.clipY, a.clipZ, b.clipX, b.clipY, b.clipZ);
          }
        } else {
          for (let index = 0; index + 1 < vertexCount; index += INDEX_PAIR_STRIDE) {
            const a = projectVertexByIndex(index);
            const b = projectVertexByIndex(index + 1);
            if (!a.visible || !b.visible) {
              continue;
            }
            lineVertices.push(a.clipX, a.clipY, a.clipZ, b.clipX, b.clipY, b.clipZ);
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
        if (lineVertices.length < MIN_LINE_CLIP_COMPONENTS) {
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
        context.uniform4f(
          cache.colorLocation,
          Math.max(0, Math.min(1, r * lightingFactor.r)),
          Math.max(0, Math.min(1, g * lightingFactor.g)),
          Math.max(0, Math.min(1, b * lightingFactor.b)),
          a,
        );
        context.drawArrays(linesPrimitiveToken, 0, lineVertices.length / VERTEX_COORD_COMPONENTS);
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
    if (
      !Array.isArray(mesh.positions)
      || mesh.positions.length < MIN_TRIANGLE_POSITION_COMPONENTS
      || mesh.positions.length % POSITION_COMPONENT_STRIDE !== 0
    ) {
      diagnostics.rejectedMeshCount += 1;
      diagnostics.rejectedMeshInvalidPositionCount += 1;
      continue;
    }
    const color = typeof mesh.color === "string" ? mesh.color : "#334155";
    const [r, g, b, a] = resolveNormalizedColor(color);
    const lightingFactor = resolveMeshLightingFactor(payload, mesh, resolveNormalizedColor);
    const vertices: number[] = [];
    const uvs: number[] = [];
    const vertexCount = Math.floor(mesh.positions.length / POSITION_COMPONENT_STRIDE);
    const textureBinding = resolveMeshMaterialTextureBinding(payload, mesh);

    const projectVertexByIndex = (vertexIndex: number): ProjectedPoint => {
      const base = vertexIndex * POSITION_COMPONENT_STRIDE;
      const worldX = mesh.positions[base] ?? 0;
      const worldY = mesh.positions[base + 1] ?? 0;
      const worldZ = mesh.positions[base + 2] ?? 0;
      return projectWorldToClip(worldX, worldY, worldZ, payload, deviceWidth, deviceHeight, dpr);
    };
    const appendUvByIndex = (vertexIndex: number): void => {
      const base = vertexIndex * 2;
      uvs.push(mesh.uvs?.[base] ?? 0, mesh.uvs?.[base + 1] ?? 0);
    };

    if (Array.isArray(mesh.indices) && mesh.indices.length >= TRIANGLE_INDEX_STRIDE) {
      const indicesAreTriangleCompatible = mesh.indices.length % TRIANGLE_INDEX_STRIDE === 0;
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
      for (let index = 0; index + 2 < mesh.indices.length; index += TRIANGLE_INDEX_STRIDE) {
        const a = projectVertexByIndex(Math.floor(mesh.indices[index] ?? 0));
        const b = projectVertexByIndex(Math.floor(mesh.indices[index + 1] ?? 0));
        const c = projectVertexByIndex(Math.floor(mesh.indices[index + 2] ?? 0));
        if (!a.visible || !b.visible || !c.visible) {
          continue;
        }
        vertices.push(a.clipX, a.clipY, a.clipZ, b.clipX, b.clipY, b.clipZ, c.clipX, c.clipY, c.clipZ);
        appendUvByIndex(Math.floor(mesh.indices[index] ?? 0));
        appendUvByIndex(Math.floor(mesh.indices[index + 1] ?? 0));
        appendUvByIndex(Math.floor(mesh.indices[index + 2] ?? 0));
      }
    } else {
      if (mesh.positions.length % MIN_TRIANGLE_POSITION_COMPONENTS !== 0) {
        diagnostics.rejectedMeshCount += 1;
        diagnostics.rejectedMeshInsufficientStreamCount += 1;
        continue;
      }
      for (let index = 0; index + 2 < vertexCount; index += TRIANGLE_INDEX_STRIDE) {
        const a = projectVertexByIndex(index);
        const b = projectVertexByIndex(index + 1);
        const c = projectVertexByIndex(index + 2);
        if (!a.visible || !b.visible || !c.visible) {
          continue;
        }
        vertices.push(a.clipX, a.clipY, a.clipZ, b.clipX, b.clipY, b.clipZ, c.clipX, c.clipY, c.clipZ);
        appendUvByIndex(index);
        appendUvByIndex(index + 1);
        appendUvByIndex(index + 2);
      }
    }

    if (vertices.length < MIN_TRIANGLE_CLIP_COMPONENTS) {
      diagnostics.rejectedMeshCount += 1;
      diagnostics.rejectedMeshInsufficientStreamCount += 1;
      continue;
    }

    context.bufferData(context.ARRAY_BUFFER, new Float32Array(vertices), context.STREAM_DRAW);
    const textureBound = textureBinding && uvs.length >= (vertices.length / VERTEX_COORD_COMPONENTS) * 2
      ? bindMaterialTexture(context, cache, textureBinding.textureKey, textureBinding.sampler)
      : { bound: false, uploadedBytes: 0, cacheHit: false, cacheMiss: false, decodeFailed: false };
    if (textureBound.bound) {
      diagnostics.materialTextureBindingCount += 1;
      diagnostics.materialTextureUploadBytes += textureBound.uploadedBytes;
      diagnostics.materialTextureCacheHitCount += textureBound.cacheHit ? 1 : 0;
      diagnostics.materialTextureCacheMissCount += textureBound.cacheMiss ? 1 : 0;
      if (textureBound.decodeFailed) {
        diagnostics.materialTextureDecodeFailureCount += 1;
        diagnostics.materialTextureDecodeFailureReason = "image-load-failed";
        diagnostics.materialTextureFallbackReason = "decode-failed";
      } else {
        diagnostics.materialTextureFallbackReason = "none";
      }
      if (cache.uvLocation >= 0 && cache.uvBuffer) {
        context.bindBuffer(context.ARRAY_BUFFER, cache.uvBuffer);
        context.bufferData(context.ARRAY_BUFFER, new Float32Array(uvs), context.STREAM_DRAW);
        context.enableVertexAttribArray(cache.uvLocation);
        context.vertexAttribPointer(cache.uvLocation, 2, context.FLOAT, false, 0, 0);
        context.bindBuffer(context.ARRAY_BUFFER, cache.vertexBuffer);
      }
    } else if (cache.useTextureLocation && typeof context.uniform1f === "function") {
      context.uniform1f(cache.useTextureLocation, 0);
    }
    context.uniform4f(
      cache.colorLocation,
      Math.max(0, Math.min(1, r * lightingFactor.r)),
      Math.max(0, Math.min(1, g * lightingFactor.g)),
      Math.max(0, Math.min(1, b * lightingFactor.b)),
      a,
    );
    context.drawArrays(context.TRIANGLES, 0, vertices.length / VERTEX_COORD_COMPONENTS);
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

  // Normalize compact efficiency summary tuple so telemetry exporters can consume a stable shape without recomputation.
  diagnostics.lineTopologySubmissionEfficiencySummary = {
    commandSuccessRate: diagnostics.lineTopologySubmissionCommandSuccessRate,
    planCoverageRate: diagnostics.lineTopologySubmissionPlanCoverageRate,
    drawPlanWastedCommandCount: diagnostics.lineTopologySubmissionDrawPlanWastedCommandCount,
  };

  // Normalize a single outcome token so telemetry does not need to infer terminal line submission state from counters.
  if (diagnostics.lineTopologySubmissionFailedCount > 0) {
    diagnostics.lineTopologySubmissionOutcome = "failed";
  } else if (diagnostics.lineTopologySubmissionSucceededCount > 0) {
    diagnostics.lineTopologySubmissionOutcome = "submitted";
  } else if (diagnostics.lineTopologySubmissionGateBlockedCount > 0) {
    diagnostics.lineTopologySubmissionOutcome = "deferred-gate-disabled";
  }
  if (typeof context.disable === "function") {
    context.disable(context.BLEND);
  }

  return diagnostics;
}
