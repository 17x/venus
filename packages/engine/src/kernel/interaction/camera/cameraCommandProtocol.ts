/** Declares supported projection modes for runtime camera composition. */
export type EngineCameraProjectionMode =
  /** Perspective projection with depth foreshortening. */
  | "perspective"
  /** Orthographic projection without distance foreshortening. */
  | "orthographic";

/** Declares mutable camera state consumed by engine graph synthesis and rendering flows. */
export type EngineCameraState = {
  /** Camera yaw in degrees around world up-axis. */
  yaw: number;
  /** Camera pitch in degrees around local right-axis. */
  pitch: number;
  /** Camera distance from focus target in world units. */
  distance: number;
  /** Camera focus target x in world units. */
  targetX: number;
  /** Camera focus target y in world units. */
  targetY: number;
  /** Camera focus target z in world units. */
  targetZ: number;
  /** Projection mode used for camera view-volume derivation. */
  projectionMode?: EngineCameraProjectionMode;
  /** Perspective vertical field of view in degrees. */
  perspectiveFovY?: number;
  /** Projection near plane in world units. */
  near?: number;
  /** Projection far plane in world units. */
  far?: number;
  /** Orthographic half-size scalar used when projection mode is orthographic. */
  orthographicHalfSize?: number;
};

/** Declares supported canonical camera presets for common editor view alignment commands. */
export type EngineCameraPreset =
  /** Front view where camera faces scene depth axis. */
  | "front"
  /** Top view where camera looks down from positive up-axis. */
  | "top"
  /** Right view where camera faces scene width axis. */
  | "right"
  /** Isometric-like view for balanced depth perception. */
  | "isometric";

/** Declares one axis-aligned world bounds packet used by frame-all camera commands. */
export type EngineCameraFrameBounds = {
  /** Minimum x bound in world units. */
  minX: number;
  /** Minimum y bound in world units. */
  minY: number;
  /** Minimum z bound in world units. */
  minZ: number;
  /** Maximum x bound in world units. */
  maxX: number;
  /** Maximum y bound in world units. */
  maxY: number;
  /** Maximum z bound in world units. */
  maxZ: number;
};

/** Declares the semantic camera command protocol intended for engine-side ownership. */
export type EngineCameraCommand =
  /** Orbit command rotates camera around current focus target. */
  | { type: "orbit"; deltaYaw: number; deltaPitch: number }
  /** Pan command translates focus target on camera view plane. */
  | { type: "pan"; deltaRight: number; deltaUp: number }
  /** Dolly command scales camera distance toward or away from focus target. */
  | { type: "dolly"; zoomFactor: number }
  /** Preset command aligns camera orientation to one canonical view. */
  | { type: "setPreset"; preset: EngineCameraPreset; preserveDistance?: boolean }
  /** Frame command centers camera target and adjusts distance to fit one bounds packet. */
  | { type: "frameBounds"; bounds: EngineCameraFrameBounds; paddingScale?: number }
  /** Projection command updates projection mode and optional projection parameters. */
  | {
      type: "setProjection";
      projectionMode: EngineCameraProjectionMode;
      perspectiveFovY?: number;
      near?: number;
      far?: number;
      orthographicHalfSize?: number;
    }
  /** Direct set command replaces full camera state deterministically. */
  | { type: "setState"; state: EngineCameraState };
