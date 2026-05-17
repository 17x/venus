# Constraints Validation And Refactor Checklist

## 1. Hard Constraints

1. Follow one-way ownership boundaries from module-boundary docs.
2. Keep engine mechanism-only; product semantics stay outside engine.
3. Avoid `any`; keep explicit public contracts.
4. Extract behavior-driving literals into named constants.

## 2. Validation Commands

Required validation before merge:

1. `pnpm --filter @venus/engine test`
2. `pnpm --filter @venus/engine exec tsc --noEmit` or workspace typecheck equivalent
3. `pnpm lint`

## 3. Cross-Module Refactor Checklist

1. Confirm no reverse imports are introduced.
2. Keep scene/store/index invariants stable when changing planning or shortlist.
3. Verify fallback taxonomy remains consistent with renderer branches.
4. Add tests for any strategy, scheduler, budget, or cache behavior changes.
5. Re-check blank-frame and sharpen-SLA diagnostics whenever render flow changes.

## 4. Current Consistency Assessment (May 2026)

1. Module ownership graph is largely aligned with restrictions docs.
2. Runtime/renderer strategy stack is rich and contract-heavy; onboarding cost is high without index docs (this documentation set addresses that gap).
3. The highest operational risk area remains interactive render fallback coherence (blank frame, overscan seams, settle sharpness timing).

## 5. Small-Range Refactor Guidance

Safe small-range refactors should prefer:

1. Isolating branch-specific fallback logic into existing domain modules.
2. Reducing duplicated threshold constants by centralizing named config values.
3. Tightening diagnostics coverage before broad algorithm changes.
