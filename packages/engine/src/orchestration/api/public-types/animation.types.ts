/**
 * Declares the interpolation mode for keyframe value blending between adjacent keys.
 */
export type EngineAnimationInterpolation =
  /** Linear interpolation between keyframe values. */
  | "linear"
  /** Step interpolation with no blending (hold previous value). */
  | "step"
  /** Cubic spline interpolation using in/out tangents. */
  | "cubicspline";

/**
 * Declares one keyframe at a specific time with a typed value.
 */
export interface EngineAnimationKeyframe<T = number> {
  /** Keyframe time in seconds from clip start. */
  time: number;
  /** Keyframe value at this time point. */
  value: T;
  /** Incoming tangent for cubicspline interpolation. */
  inTangent?: T;
  /** Outgoing tangent for cubicspline interpolation. */
  outTangent?: T;
}

/**
 * Declares the target property path for one animation channel.
 * Dot-separated path from scene node root, e.g. "transform.translation.x".
 */
export type EngineAnimationTargetPath = string;

/**
 * Declares one animation channel binding keyframes to a target property.
 */
export interface EngineAnimationChannel<T = number> {
  /** Target property path on the scene node. */
  targetPath: EngineAnimationTargetPath;
  /** Interpolation mode used between keyframes. */
  interpolation: EngineAnimationInterpolation;
  /** Ordered keyframe array sorted by time. */
  keyframes: readonly EngineAnimationKeyframe<T>[];
}

/**
 * Declares the loop behavior for animation clip playback.
 */
export type EngineAnimationLoopMode =
  /** Play once and stop at the end. */
  | "once"
  /** Loop continuously from start after reaching the end. */
  | "loop"
  /** Ping-pong: alternate forward and reverse playback. */
  | "pingpong";

/**
 * Declares one animation clip containing timed channels for scene node properties.
 */
export interface EngineAnimationClip {
  /** Unique clip identifier. */
  id: string;
  /** Clip name for editor display and debugging. */
  name: string;
  /** Clip duration in seconds. */
  duration: number;
  /** Loop behavior for playback. */
  loopMode: EngineAnimationLoopMode;
  /** Ordered animation channels in this clip. */
  channels: readonly EngineAnimationChannel[];
}

/**
 * Declares the animation clip collection payload used in scene graph composition.
 */
export interface EngineAnimationClipCollection {
  /** Ordered animation clips in the scene. */
  clips: readonly EngineAnimationClip[];
}
