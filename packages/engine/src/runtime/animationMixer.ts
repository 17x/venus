import type { EngineAnimationClip } from "../orchestration/api/public-types/animation.types";

/**
 * Declares the animation mixer playback state for one active clip.
 */
export type EngineAnimationPlaybackState =
  /** Clip is stopped and not playing. */
  | "stopped"
  /** Clip is currently playing forward. */
  | "playing"
  /** Clip is paused and can be resumed. */
  | "paused";

/**
 * Declares one active animation clip instance in the mixer.
 */
export interface EngineAnimationClipInstance {
  /** Reference to the source animation clip. */
  clip: EngineAnimationClip;
  /** Current playback state. */
  state: EngineAnimationPlaybackState;
  /** Current playback time in seconds. */
  currentTime: number;
  /** Playback speed multiplier (1 = normal, -1 = reverse). */
  speed: number;
  /** Loop count remaining (-1 = infinite). */
  loopRemaining: number;
  /** Weight for blending with other clips (0–1). */
  weight: number;
}

/**
 * Declares the animation mixer/state machine API for deterministic clip playback.
 */
export interface EngineAnimationMixer {
  /** Adds one clip to the mixer and returns its instance. */
  addClip(clip: EngineAnimationClip, weight?: number): EngineAnimationClipInstance;
  /** Removes one clip from the mixer by id. */
  removeClip(clipId: string): boolean;
  /** Plays one clip from the beginning. */
  play(clipId: string, speed?: number): void;
  /** Pauses one playing clip. */
  pause(clipId: string): void;
  /** Stops one clip and resets to time 0. */
  stop(clipId: string): void;
  /** Advances all active clips by delta seconds (deterministic tick). */
  update(deltaSeconds: number): void;
  /** Returns all active clip instances. */
  getActiveClips(): readonly EngineAnimationClipInstance[];
  /** Creates a deterministic replay token for the current mixer state. */
  createReplayToken(): string;
}

/**
 * Creates an animation mixer with deterministic tick-based update.
 */
export function createEngineAnimationMixer(): EngineAnimationMixer {
  const clips = new Map<string, EngineAnimationClipInstance>();

  function createReplayToken(): string {
    const parts: string[] = [];
    for (const [id, inst] of clips) {
      parts.push(`${id}:${inst.currentTime.toFixed(4)}:${inst.state}:${inst.speed}`);
    }
    return parts.sort().join("|");
  }

  function update(deltaSeconds: number): void {
    for (const inst of clips.values()) {
      if (inst.state !== "playing") continue;
      inst.currentTime += deltaSeconds * inst.speed;
      if (inst.currentTime >= inst.clip.duration) {
        if (inst.loopRemaining === 0) {
          inst.state = "stopped";
          inst.currentTime = inst.clip.duration;
        } else {
          inst.currentTime -= inst.clip.duration;
          if (inst.loopRemaining > 0) inst.loopRemaining -= 1;
        }
      } else if (inst.currentTime < 0) {
        inst.currentTime = 0;
        inst.state = "stopped";
      }
    }
  }

  return {
    addClip: (clip, weight = 1) => {
      const inst: EngineAnimationClipInstance = {
        clip, state: "stopped", currentTime: 0,
        speed: 1, loopRemaining: clip.loopMode === "once" ? 0 : -1, weight,
      };
      clips.set(clip.id, inst);
      return inst;
    },
    removeClip: (id) => clips.delete(id),
    play: (id, speed = 1) => {
      const inst = clips.get(id);
      if (inst) { inst.state = "playing"; inst.speed = speed; inst.currentTime = 0; }
    },
    pause: (id) => { const inst = clips.get(id); if (inst) inst.state = "paused"; },
    stop: (id) => { const inst = clips.get(id); if (inst) { inst.state = "stopped"; inst.currentTime = 0; } },
    update,
    getActiveClips: () => [...clips.values()],
    createReplayToken,
  };
}
