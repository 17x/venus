# Scenario Adapter Boundary Cookbook

Status: Release contract draft.
Scope: ENG-008.

Scenario adapters live outside engine. They translate domain data into generic engine graph, resources, events, and queries.

## Adapter Pattern

1. Parse app-owned source data.
2. Normalize units, ids, revisions, and asset references.
3. Emit generic engine graph nodes and resource descriptors.
4. Submit through public engine APIs.
5. Translate engine diagnostics back into app language.

## Forbidden Leakage

Do not add domain terms such as DICOM, IFC, 3D Tiles, OpenSCENARIO, SVG, glTF, USD, medical, BIM, GIS, CAD, game, video, or commerce to core engine API names.

## Cookbook Targets

Playground scenarios may use these domain labels in app docs and adapters, but engine receives only generic graph/resource/query/replay data.
