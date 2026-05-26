/**
 * Declares the canonical light type tokens supported by the engine lighting system.
 */
export type EngineLightType =
  /** Directional light with parallel rays from infinity. */
  | "directional"
  /** Point light radiating equally in all directions from a position. */
  | "point"
  /** Spot light with a conical falloff from a position and direction. */
  | "spot"
  /** Ambient light providing uniform scene illumination. */
  | "ambient"
  /** Hemisphere light blending sky and ground colors across the scene. */
  | "hemisphere";

/**
 * Base light entity contract shared by all light types.
 */
export interface EngineLightEntityBase {
  /** Unique light identifier within the scene graph. */
  id: string;
  /** Light type token classifying the illumination model. */
  type: EngineLightType;
  /** RGB color intensity as a CSS hex or named color string. */
  color: string;
  /** Linear intensity multiplier applied to the light color. */
  intensity: number;
}

/**
 * Directional light entity emitting parallel rays from infinity toward a target.
 */
export interface EngineDirectionalLight extends EngineLightEntityBase {
  type: "directional";
  /** World-space x coordinate of the light target point. */
  targetX: number;
  /** World-space y coordinate of the light target point. */
  targetY: number;
  /** World-space z coordinate of the light target point. */
  targetZ: number;
}

/**
 * Point light entity radiating equally in all directions from a position.
 */
export interface EnginePointLight extends EngineLightEntityBase {
  type: "point";
  /** World-space x coordinate of the light position. */
  positionX: number;
  /** World-space y coordinate of the light position. */
  positionY: number;
  /** World-space z coordinate of the light position. */
  positionZ: number;
  /** Maximum distance the light reaches; 0 means no limit. */
  distance: number;
  /** Exponential decay factor; 2 is physically correct for inverse-square. */
  decay: number;
}

/**
 * Spot light entity with a conical falloff from a position toward a target.
 */
export interface EngineSpotLight extends EngineLightEntityBase {
  type: "spot";
  /** World-space x coordinate of the light position. */
  positionX: number;
  /** World-space y coordinate of the light position. */
  positionY: number;
  /** World-space z coordinate of the light position. */
  positionZ: number;
  /** World-space x coordinate of the light target point. */
  targetX: number;
  /** World-space y coordinate of the light target point. */
  targetY: number;
  /** World-space z coordinate of the light target point. */
  targetZ: number;
  /** Maximum distance the light reaches; 0 means no limit. */
  distance: number;
  /** Exponential decay factor; 2 is physically correct for inverse-square. */
  decay: number;
  /** Outer cone half-angle in radians. */
  angle: number;
  /** Inner-to-outer cone blend factor (0 = hard edge, 1 = smooth transition). */
  penumbra: number;
}

/**
 * Ambient light entity providing uniform scene illumination.
 */
export interface EngineAmbientLight extends EngineLightEntityBase {
  type: "ambient";
}

/**
 * Hemisphere light entity blending sky and ground colors.
 */
export interface EngineHemisphereLight extends EngineLightEntityBase {
  type: "hemisphere";
  /** RGB ground color as a CSS hex or named color string. */
  groundColor: string;
}

/**
 * Discriminated union of all supported light entity types.
 */
export type EngineLightEntity =
  | EngineDirectionalLight
  | EnginePointLight
  | EngineSpotLight
  | EngineAmbientLight
  | EngineHemisphereLight;

/**
 * Light collection payload used in scene graph composition.
 */
export interface EngineLightCollection {
  /** Ordered light entities in the scene. */
  lights: readonly EngineLightEntity[];
}
