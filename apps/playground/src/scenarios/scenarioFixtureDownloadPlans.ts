export interface PlaygroundScenarioFixtureDownloadPlan {
  scenarioId: string
  downloadMode: 'manual-review-required' | 'scriptable-after-license-review'
  targetFixturePath: string
  validationPlan: readonly string[]
}

export const PLAYGROUND_SCENARIO_FIXTURE_DOWNLOAD_PLANS: readonly PlaygroundScenarioFixtureDownloadPlan[] = [
  {scenarioId: 's1-medical-volume-slice-runtime', downloadMode: 'scriptable-after-license-review', targetFixturePath: 'apps/playground/public/scenario-fixtures/s1/volcano.csv', validationPlan: ['verify license note', 'record checksum', 'sample scalar grid dimensions']},
  {scenarioId: 's2-preop-path-simulation', downloadMode: 'scriptable-after-license-review', targetFixturePath: 'apps/playground/public/scenario-fixtures/s2/airports.csv', validationPlan: ['verify license note', 'record checksum', 'sample coordinate bounds']},
  {scenarioId: 's3-bim-collab-review', downloadMode: 'scriptable-after-license-review', targetFixturePath: 'apps/playground/public/scenario-fixtures/s3/vancouver-blocks.json', validationPlan: ['verify license note', 'record checksum', 'sample polygon count']},
  {scenarioId: 's4-cad-assembly-validation', downloadMode: 'scriptable-after-license-review', targetFixturePath: 'apps/playground/public/scenario-fixtures/s4/cars.json', validationPlan: ['verify license note', 'record checksum', 'sample numeric fields']},
  {scenarioId: 's5-gis-live-map-streaming', downloadMode: 'manual-review-required', targetFixturePath: 'apps/playground/public/scenario-fixtures/s5/usgs-earthquakes.sample.json', validationPlan: ['verify public feed terms', 'record sample timestamp', 'record checksum']},
  {scenarioId: 's6-autodrive-twin-replay', downloadMode: 'scriptable-after-license-review', targetFixturePath: 'apps/playground/public/scenario-fixtures/s6/nbaallelo.csv', validationPlan: ['verify license note', 'record checksum', 'sample timeline ordering']},
  {scenarioId: 's7-city-twin-monitor-wall', downloadMode: 'scriptable-after-license-review', targetFixturePath: 'apps/playground/public/scenario-fixtures/s7/world-gdp.csv', validationPlan: ['verify license note', 'record checksum', 'sample country code coverage']},
  {scenarioId: 's8-commerce-product-variant-runtime', downloadMode: 'manual-review-required', targetFixturePath: 'apps/playground/public/scenario-fixtures/s8/products.sample.json', validationPlan: ['verify demo API terms', 'record sample timestamp', 'record checksum']},
  {scenarioId: 's9-molecular-volume-exploration', downloadMode: 'scriptable-after-license-review', targetFixturePath: 'apps/playground/public/scenario-fixtures/s9/earthquakes.json', validationPlan: ['verify license note', 'record checksum', 'sample point count']},
  {scenarioId: 's10-game-editor-runtime-preview', downloadMode: 'scriptable-after-license-review', targetFixturePath: 'apps/playground/public/scenario-fixtures/s10/miserables.json', validationPlan: ['verify license note', 'record checksum', 'sample node edge counts']},
  {scenarioId: 's11-node-headless-rendering', downloadMode: 'scriptable-after-license-review', targetFixturePath: 'apps/playground/public/scenario-fixtures/s11/unemployment.json', validationPlan: ['verify license note', 'record checksum', 'sample series count']},
  {scenarioId: 's12-vector-editor-optin-2d', downloadMode: 'scriptable-after-license-review', targetFixturePath: 'apps/playground/public/scenario-fixtures/s12/seattle-weather.csv', validationPlan: ['verify license note', 'record checksum', 'sample date range']},
  {scenarioId: 's13-video-timeline-composition', downloadMode: 'scriptable-after-license-review', targetFixturePath: 'apps/playground/public/scenario-fixtures/s13/stocks.csv', validationPlan: ['verify license note', 'record checksum', 'sample ticker coverage']},
] as const
