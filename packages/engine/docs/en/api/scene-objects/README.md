# Scene Object API Index

This directory defines engine-owned object APIs one object at a time. These docs
are the API source of truth for future implementation work.

## Object APIs

| Category | API Pages |
| --- | --- |
| Structure | `scene-snapshot.md`, `group.md` |
| Shapes | `rect.md`, `ellipse.md`, `line.md`, `polygon.md`, `path.md` |
| Content | `text.md`, `image.md` |
| Constraints | `clip.md` |
| Mechanisms | `camera.md`, `cache.md` |

Each API page includes a minimal `Demo` section that can be copied into a local
engine runtime setup.

## Development Rule

Every new object capability should start by updating the relevant API page, then
adding a capability test, then implementing the mechanism.
