# Snapshot Samples

Store real FlatBuffer snapshot binaries by schema version.

## Rules

- Keep at least one valid sample per released schema version.
- Never delete old samples after adding a new schema version.
- Use samples to verify parse + migrate pipelines in tests and debugging.

## Layout

```text
samples/
  v1/
    sample_scene_v1.bin
  v2/
    sample_scene_v2.bin
```
