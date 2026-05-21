# @venus/editor-primitive Public API

Status: Current package
Source anchor: `packages/editor-primitive/src/index.ts`

## Overview

`@venus/editor-primitive` provides reusable editor interaction primitives.

It is intended to remain decoupled from engine private internals.

## Public Export Groups

`@venus/editor-primitive` currently exports these groups:

- `pointer`
- `keyboard`
- `shortcut`
- `gesture`
- `tool`
- `operation`
- `target`
- `command`
- `selection`
- `policy`
- `hover`
- `overlay`
- `cursor`
- `viewport`
- `capture`
- `runtime`
- `input`
- `control`
- `overlay-model`
- `selector`

## Compatibility Notes

- Keep APIs focused on reusable primitives and contracts.
- Avoid private imports from `@venus/engine` internals.
- Any migration adapter should include explicit removal conditions.
