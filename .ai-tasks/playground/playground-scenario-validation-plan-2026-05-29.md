# Playground Scenario Validation Plan (2026-05-29)

## 0. Scope Definition

Playground validates engine capability across S1-S13 scenarios with real data, interaction harnesses, and deterministic rendering.

### Current Scenario Folder Structure

```
src/scenarios/
  2d-basic/          — S12 Vector Editor Opt-in 2D (empty folder)
  2d-interactive/    — S12 interactive variant (empty folder)
  2d-performance/    — S12 performance variant (empty folder)
  3d-editor-validation/ — S10 Game Editor Runtime Preview (empty folder)
  3d-spatial/        — S1 Medical Volume / S2 Pre-op / S4 CAD (empty folder)
  canvas2d-fallback/ — S11 Node Headless fallback (empty folder)
  headless-deterministic/ — S11 deterministic frame output (empty folder)
  webgl-render/      — S5 GIS / S7 City Twin / S8 Commerce (empty folder)
```

### Scenario → Data Type Mapping

| ID  | Scenario                  | Data Type                   | Format  | Source                          |
| --- | ------------------------- | --------------------------- | ------- | ------------------------------- |
| S1  | Medical Volume Slice      | scalar field grid           | CSV     | volcano.csv (plotly)            |
| S2  | Pre-op Path Simulation    | coordinate waypoints        | CSV     | airports.csv (vega)             |
| S3  | BIM Collaborative Review  | building footprint polygons | GeoJSON | vancouver-blocks.json (deck.gl) |
| S4  | CAD Assembly Validation   | vehicle specs / part dims   | JSON    | cars.json (vega)                |
| S5  | GIS Live Map Streaming    | earthquake GeoJSON          | GeoJSON | USGS live feed                  |
| S6  | Autonomous Driving Replay | timeline match records      | CSV     | nbaallelo.csv (538)             |
| S7  | City Twin Monitor Wall    | GDP country stats           | CSV     | world_gdp.csv (plotly)          |
| S8  | Commerce Product Variant  | product catalog             | JSON    | fakestoreapi.com                |
| S9  | Molecular Volume          | earthquake point-cloud      | JSON    | earthquakes.json (vega)         |
| S10 | Game Editor Runtime       | graph topology              | JSON    | miserables.json (vega)          |
| S11 | Node Headless Rendering   | industry time-series        | JSON    | unemployment.json (vega)        |
| S12 | Vector Editor Opt-in 2D   | weather curves              | CSV     | seattle-weather.csv (vega)      |
| S13 | Video Timeline            | stock series                | CSV     | stocks.csv (vega)               |

### TODO: Data Downloads

All scenario folders are empty. Need to:

- [ ] Download sample datasets to respective folders
- [ ] Add deterministic local fallback fixtures
- [ ] Add checksum validation for each fixture
- [ ] Add license attribution for each dataset

### Current Playground Contracts

Test coverage (17 tests, 0 fail):

- scenarioCatalogCoverage: S1-S13 enumeration, route/id contracts ✅
- scenarioDataManifests: source, license, checksum, format per scenario ✅
- scenarioModelSpecs: source data, adapter output, engine projection ✅
- scenarioFixtureDownloadPlans: target path, review mode, checksum steps ✅
- scenarioInteractionHarnesses: controls, telemetry, deterministic state ✅
- scenarioFixtureReadiness: review mode, checksum, license steps ✅
- fixtureChecksumReadiness: unique paths, parent directories ✅
- fixtureDownloadInstructions: curl+sha256sum commands ✅
- streamingScaleGates: dense scene + LOD streaming contracts ✅
- distNonblankBuild: JS/CSS/HTML artifact validation ✅
- routeCanvasNonblank: index.html root div, script refs ✅
- routeScenarioSmoke: bundle route references ✅
- browserSmoke: headless Chromium page render ✅

### Remaining Playground Work

- [ ] Download actual datasets to scenario folders with checksums
- [ ] Add per-scenario interaction depth (beyond static labels)
- [ ] Add scenario-specific render parity tests
- [ ] Add streaming/LOD stress variants for S5/S7
- [ ] Add canvas2d fallback verification for S11/S12
