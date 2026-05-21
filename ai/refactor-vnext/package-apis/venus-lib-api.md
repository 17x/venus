# @venus/lib Public API

Status: Current package
Source anchor: `packages/lib/src/index.ts`

## Overview

`@venus/lib` is the foundational dependency shared by engine and editor layers.

It should remain runtime-agnostic and platform-agnostic.

## Public Export Groups

`@venus/lib` currently exports these groups:

- `math`
- `geometry`
- `ids`
- `events`
- `lifecycle`
- `scheduler`
- `patch`
- `collections`
- `logger`
- `worker`
- `serialization`
- `assert`
- `viewport`

## Compatibility Notes

- Do not add DOM/React/renderer-specific exports.
- Keep deterministic and pure utility boundaries.
- Changes in export groups should be backward-compatible or explicitly versioned by cutover policy.
