# Venus Review Checklist

## Correctness

- Does the change preserve existing behavior outside the intended scope?
- Are edge cases handled for empty, null, async, and error states?
- Are types tightened instead of bypassed?
- Does the change respect strict TypeScript settings without leaning on ignore comments?

## Architecture

- Does the change respect app vs shared package boundaries?
- Is worker/runtime logic kept out of the UI layer unless intentionally bridged?
- Is new coupling introduced, and if so is it justified?
- Does the shared runtime stack keep `@venus/runtime` framework-agnostic and avoid pulling product-specific UI concerns into shared packages?
- If a package entrypoint changed, is the exported surface still coherent and intentionally small?

## Maintainability

- Is the solution simpler than the alternatives that fit the same constraints?
- Are names and file locations discoverable for the next person?
- Are comments only used where they add real clarity?
- Does the change follow the repo's established import style, alias usage, and file organization?

## Validation

- Was the changed path linted, typechecked, or otherwise exercised?
- If tests are absent, was a realistic manual verification path described?
- Are known risks or unverified areas called out explicitly?
- If architecture-sensitive code changed, were relevant docs or runtime assumptions rechecked?
