# Playground Remote Scenario Subpages (S1-S13)

All playground demos are route-based subpages mapped from the main task scenario matrix.
Homepage is deprecated; root route redirects to `/demo/s1-medical-volume-slice-runtime`.

## Scenario Routes

- `/demo/s1-medical-volume-slice-runtime`
  - Scenario: S1 Medical CT/MRI
  - Data: `https://raw.githubusercontent.com/plotly/datasets/master/volcano.csv`
- `/demo/s2-preop-path-simulation`
  - Scenario: S2 Surgical planning
  - Data: `https://raw.githubusercontent.com/vega/vega-datasets/main/data/airports.csv`
- `/demo/s3-bim-collab-review`
  - Scenario: S3 BIM review
  - Data: `https://raw.githubusercontent.com/visgl/deck.gl-data/master/examples/geojson/vancouver-blocks.json`
- `/demo/s4-cad-assembly-validation`
  - Scenario: S4 Industrial CAD
  - Data: `https://raw.githubusercontent.com/vega/vega-datasets/main/data/cars.json`
- `/demo/s5-gis-live-map-streaming`
  - Scenario: S5 GIS 2D/3D
  - Data: `https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_week.geojson`
- `/demo/s6-autodrive-twin-replay`
  - Scenario: S6 Driving twin replay
  - Data: `https://raw.githubusercontent.com/fivethirtyeight/data/master/nba-elo/nbaallelo.csv`
- `/demo/s7-city-twin-monitor-wall`
  - Scenario: S7 City twin wall
  - Data: `https://raw.githubusercontent.com/plotly/datasets/master/2014_world_gdp_with_codes.csv`
- `/demo/s8-commerce-product-variant-runtime`
  - Scenario: S8 Commerce 3D
  - Data: `https://fakestoreapi.com/products`
- `/demo/s9-molecular-volume-exploration`
  - Scenario: S9 Molecular and volume
  - Data: `https://raw.githubusercontent.com/vega/vega-datasets/main/data/earthquakes.json`
- `/demo/s10-game-editor-runtime-preview`
  - Scenario: S10 Game editor/runtime parity
  - Data: `https://raw.githubusercontent.com/vega/vega-datasets/main/data/miserables.json`
- `/demo/s11-node-headless-rendering`
  - Scenario: S11 Node rendering
  - Data: `https://raw.githubusercontent.com/vega/vega-datasets/main/data/unemployment-across-industries.json`
- `/demo/s12-vector-editor-optin-2d`
  - Scenario: S12 2D vector editor
  - Data: `https://raw.githubusercontent.com/vega/vega-datasets/main/data/seattle-weather.csv`
- `/demo/s13-video-timeline-composition`
  - Scenario: S13 Video editor
  - Data: `https://raw.githubusercontent.com/vega/vega-datasets/main/data/stocks.csv`

## Capability-Driven Evolution (Reverse Inference)

From scenario capability demands, engine evolution priorities are inferred as:

1. Cross-scenario graph contract stability (`setGraph`, deterministic revisions, replay-safe snapshots).
2. 3D semantic baseline completion (`semantic3d` bounds/transform/material/visibility).
3. Spatial query and picking consistency (2D/3D candidate filtering and deterministic hit behavior).
4. Visibility/extraction/streaming chain hardening for dense and city-scale scenarios.
5. Timeline and replay primitives (S6/S10 style deterministic state progression).
6. Multi-backend parity (WebGL/WebGPU/Canvas2D/headless diagnostics and compatibility fallback).
7. Diagnostics and governance as first-class API contracts (`getDiagnostics`, `getStats`, render-path telemetry).
8. Scenario-complete matrix closure (S1-S13) with deterministic node outputs, explicit 2D opt-in, and timeline composition primitives.

## Runtime Notes

- All endpoints are free and public.
- On endpoint failure, each page keeps rendering and reports readable load errors in status text.
