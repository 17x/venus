// Unit test for cn(): the workspace-wide className composition utility.
// Verifies clsx falsy filtering and tailwind-merge conflict resolution.
import assert from 'node:assert/strict'
import test from 'node:test'

import {cn} from '../cn.ts'

test('cn merges plain strings', () => {
  // Plain merge concatenates with whitespace, no dedup expected for non-conflicting tokens.
  assert.equal(cn('a', 'b'), 'a b')
})

test('cn drops falsy inputs (clsx behavior)', () => {
  // false / null / undefined / 0 / '' must be discarded so caller can use conditionals inline.
  assert.equal(cn('a', false, null, undefined, 0 as unknown as string, '', 'b'), 'a b')
})

test('cn resolves Tailwind conflicts (tailwind-merge)', () => {
  // Later padding utility must win over earlier one within the same scale.
  assert.equal(cn('p-2', 'p-4'), 'p-4')
  // Different scales (x vs y) must coexist; only true conflicts collapse.
  assert.equal(cn('px-2', 'py-4'), 'px-2 py-4')
})

test('cn flattens arrays and objects from clsx', () => {
  // clsx supports nested arrays and { class: condition } maps; cn must surface them through twMerge.
  assert.equal(cn(['a', ['b', {c: true, d: false}]]), 'a b c')
})
