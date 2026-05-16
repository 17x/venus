# T0021 Pressure Monitor Contract

Status: In Progress

## Inputs

- cpuLoad in range [0, 1]
- gpuLoad in range [0, 1]
- memoryLoad in range [0, 1]
- visibilityLoad in range [0, 1]
- streamingLoad in range [0, 1]

## Output

- pressure tier: `low` / `medium` / `high`
- smoothed score
- hysteresis-stable transition behavior

## Acceptance

- zig-zag wave input does not flap pressure every frame.
