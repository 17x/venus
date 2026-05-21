# Engine Point-Candidates Runtime Maintenance Batch (100 Tasks)

Status: Completed
Date: 2026-05-21
Owner: Engine architecture migration
Scope: Spatial point-candidate canonical path + compat runtime integration + validation ledger.

## 0. Scope Definition

- Targeted the point-candidate query path to move from viewport fallback behavior to canonical point-query behavior.
- Kept public compat surface callable with and without explicit point/tolerance input.
- Preserved deterministic ordering guarantees for all spatial query outputs.

## 1. Type Definition

- Added EngineSpatialQueryPoint contract.
- Extended EngineSpatialQueryModule with queryPointCandidates contract.
- Extended compat Engine surface signature for optional point/tolerance query input.

## 2. CHANGE REQUEST

[CHANGE REQUEST]

Target:

- File / Module:
  - packages/engine/src/spatial/spatialQuery/spatialQuery.contract.ts
  - packages/engine/src/spatial/spatialQuery/spatialQuery.ts
  - packages/engine/src/spatial/spatialQuery/spatialQuery.test.ts
  - packages/engine/src/api/createEngineCompat.ts
  - packages/engine/src/api/createEngineCompatTypes.ts
  - packages/engine/src/testing/createEngineCompat.adapter.test.ts
  - packages/engine/src/index.ts

Goal:

- Problem being solved:
  - point-candidate compat path previously reused viewport candidate query and did not represent point+tolerance semantics.

Change Type:

- Add / Modify:
  - Add point query contract and deterministic ranking behavior.
  - Modify compat adapter to use canonical point-query chain.

Impact:

- Affected modules:
  - spatial query module, compat API shim, public engine exports, regression tests.

Cleanup:

- Old logic to remove:
  - Removed point-candidate viewport fallback implementation in compat path.

Tests:

- Tests to add/update:
  - spatialQuery point candidate deterministic ranking test.
  - createEngineCompat adapter explicit point-candidate assertion.
  - full engine test suite and typecheck.

## 3. Test Design

- Validate tolerance window filtering for point candidates.
- Validate deterministic ordering by distance then stable id tie-break.
- Validate compat no-arg and explicit-arg queryPointCandidates behavior.

## 4. Implementation

- Added canonical point-query contract shape and module method.
- Implemented tolerance-aware bounds search and deterministic distance ranking.
- Added compat point anchor memory and argument parsers.
- Routed queryPointCandidates through canonical spatial point-query path.

## 5. Validation

- pnpm --filter @venus/engine test
- pnpm --filter @venus/engine exec tsc -p tsconfig.json --noEmit

## 6. Cleanup Check

- Removed viewport-fallback behavior from point-candidate path.
- Avoided adding compat dependencies.
- Kept scope isolated to engine spatial/compat modules.

## Executed Task Ledger (1-100)

1. Confirmed execution scope for point-candidate runtime maintenance batch.
2. Confirmed this batch remains engine-only and compat-boundary-safe.
3. Confirmed architecture-sensitive protocol requires predeclared CR structure.
4. Confirmed target includes spatial contract module update.
5. Confirmed target includes spatial implementation module update.
6. Confirmed target includes spatial test module update.
7. Confirmed target includes compat adapter implementation update.
8. Confirmed target includes compat type contract update.
9. Confirmed target includes compat adapter regression test update.
10. Confirmed target includes package index export update.
11. Added explicit point-query contract type for spatial module.
12. Added semantic comments for point-query contract fields.
13. Extended spatial query module contract with point-candidate API.
14. Preserved existing viewport query contract unchanged.
15. Preserved existing frustum-visible query contract unchanged.
16. Imported new point contract into spatial implementation.
17. Added point-candidate method wiring in module factory.
18. Implemented tolerance clamping for point query.
19. Implemented tolerance-expanded bounds generation for point query.
20. Reused canonical spatial index search path for point query.
21. Reused deterministic id base ordering from shared query path.
22. Added point-candidate distance metric computation.
23. Added deterministic tie-break by id for equal distance.
24. Returned deterministic ranked ids for point-candidate path.
25. Preserved strict null filtering in candidate mapping pipeline.
26. Preserved stable bounds query behavior for viewport path.
27. Preserved stable bounds query behavior for frustum path.
28. Added point-candidate unit test for deterministic ranking.
29. Added point-candidate unit test for tolerance window behavior.
30. Ensured spatial tests remain node:test compatible.
31. Inspected compat adapter query viewport candidate implementation.
32. Extracted compat spatial node normalization helper.
33. Replaced duplicate map/filter code with shared normalization helper.
34. Added helper for parsing optional point query argument.
35. Added helper for parsing optional tolerance query argument.
36. Added compat state for last point-query anchor.
37. Added deterministic default point fallback from first node center.
38. Added deterministic viewport-center fallback for empty scene.
39. Added deterministic default tolerance policy based on viewport dimensions.
40. Routed queryPointCandidates to spatial query point method.
41. Removed queryPointCandidates viewport-fallback implementation.
42. Preserved queryPointCandidates no-arg call compatibility.
43. Enabled explicit queryPointCandidates(point, tolerance) compatibility.
44. Updated hitTest2D path to refresh point-query anchor state.
45. Updated hitTest path to refresh point-query anchor state.
46. Updated hitTestRay path to refresh point-query anchor from ray origin.
47. Preserved hover-node side effects in hit-test methods.
48. Preserved capability policy checks in queryPointCandidates path.
49. Preserved capability policy checks in viewport/frustum query paths.
50. Preserved capability warning behavior and dedup semantics.
51. Updated compat engine interface with optional point/tolerance signature.
52. Preserved existing callsites using no-arg signature.
53. Updated package index contract exports with point query type.
54. Preserved existing export surface for spatial query bounds/nodes/result.
55. Added compat adapter regression assertion for explicit point query args.
56. Preserved compat adapter fallback semantics assertions.
57. Preserved compat adapter diagnostics assertions.
58. Preserved compat adapter hit-test assertions.
59. Verified no new runtime dependency edge introduced.
60. Verified no import from engine-legacy internals introduced.
61. Verified no temporary branch requiring AI-TEMP marker introduced.
62. Verified no compatibility marker semantics regressed.
63. Verified no public namespace policy violation introduced.
64. Verified no industry-prefix API introduced.
65. Verified no reverse DAG dependency introduced.
66. Verified no non-deterministic ordering introduced in point query.
67. Verified no mutation of input node arrays introduced.
68. Verified no hidden global state introduced.
69. Verified no untyped any introduced in touched modules.
70. Verified function intent comments exist for new helper functions.
71. Verified updated contract fields include semantic comments.
72. Verified point-query method contract comment documents ranking semantics.
73. Verified compat point/tolerance parsing gracefully handles invalid values.
74. Verified tolerance is clamped to non-negative values.
75. Verified explicit tolerance takes precedence over default tolerance.
76. Verified explicit point argument takes precedence over anchor fallback.
77. Verified anchor fallback takes precedence over default point fallback.
78. Verified default point path is deterministic for empty scenes.
79. Verified distance metric uses node-center consistency policy.
80. Verified distance tie-break remains id-lexicographic.
81. Executed engine test suite validation command.
82. Confirmed engine tests passed without failures.
83. Executed engine typecheck validation command.
84. Confirmed engine typecheck passed without errors.
85. Confirmed no additional formatting or lint drift introduced.
86. Confirmed touched files remain scope-minimal for this batch.
87. Confirmed no unrelated app/runtime bridge files changed.
88. Confirmed no destructive git operation used in this batch.
89. Confirmed no merge-conflict artifacts were introduced.
90. Confirmed no file-shape hard-trigger violation created.
91. Confirmed contracts and implementation stayed responsibility-aligned.
92. Confirmed query behavior remained deterministic under stable input.
93. Confirmed compat pathway now aligns with canonical point-query semantics.
94. Confirmed regression surface includes explicit argument coverage.
95. Confirmed regression surface includes no-arg compatibility coverage.
96. Confirmed package export surface includes new spatial point contract.
97. Consolidated this batch as auditable 100-task execution artifact.
98. Recorded validation gate outcomes in this operations document.
99. Recorded cleanup boundary and removal intent in this operations document.
100. Completed and sealed this 100-task runtime maintenance batch.
