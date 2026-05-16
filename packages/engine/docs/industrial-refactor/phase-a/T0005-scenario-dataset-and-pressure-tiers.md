# T0005 Scenario Dataset and Pressure Tiers

Status: In Progress

## Dataset Matrix

- Editor: graph-heavy editable canvas, 300k+ nodes
- Game: dynamic actors + particle bursts + camera motion
- Animation: long timeline + multi-track interpolation + seek
- Medical: multi-layer 3D volume + annotation overlays
- Massive-data: point/line/polygon mixed dataset, 300k+

## Tier Definition

- `low`: development sanity and contract validation
- `medium`: representative production baseline
- `high`: stress baseline and scaling checkpoints
- `extreme`: redline behavior and fallback verification

## Generator Constraints

- Deterministic with fixed seed.
- Schema-compatible across tiers.
- Reproducible by script in local and CI.
