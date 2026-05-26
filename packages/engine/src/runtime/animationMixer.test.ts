import assert from "node:assert/strict";
import test from "node:test";

import { createEngineAnimationMixer } from "./animationMixer";
import type { EngineAnimationClip } from "../orchestration/api/public-types/animation.types";

function makeClip(id: string, duration: number, loopMode: "once" | "loop" = "once"): EngineAnimationClip {
  return { id, name: id, duration, loopMode, channels: [] };
}

test("mixer addClip and play advances time", () => {
  const mixer = createEngineAnimationMixer();
  const clip = makeClip("a", 2);
  mixer.addClip(clip);
  mixer.play("a");
  mixer.update(0.5);
  const clips = mixer.getActiveClips();
  assert.equal(clips[0].currentTime, 0.5);
  assert.equal(clips[0].state, "playing");
});

test("mixer stops at clip end for once loop mode", () => {
  const mixer = createEngineAnimationMixer();
  mixer.addClip(makeClip("a", 1, "once"));
  mixer.play("a");
  mixer.update(1.5);
  assert.equal(mixer.getActiveClips()[0].state, "stopped");
});

test("mixer loops for loop mode", () => {
  const mixer = createEngineAnimationMixer();
  mixer.addClip(makeClip("a", 1, "loop"));
  mixer.play("a");
  mixer.update(1.5);
  const inst = mixer.getActiveClips()[0];
  assert.equal(inst.state, "playing");
  assert.ok(inst.currentTime < 1);
});

test("replay token is deterministic", () => {
  const mixer = createEngineAnimationMixer();
  mixer.addClip(makeClip("a", 2));
  mixer.play("a");
  mixer.update(0.5);
  const token1 = mixer.createReplayToken();
  const token2 = mixer.createReplayToken();
  assert.equal(token1, token2);
});
