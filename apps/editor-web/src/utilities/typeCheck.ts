/**
 * Utility function to get the JSON standard type of a given variable as a string.
 *
 * @returns The JSON standard type of the variable in string form (e.g., "string", "number").
 * @param value
 */
function typeCheck(value: unknown): string {
  if (value === null) {
    return 'null'
  }

  if (value === undefined) {
    return 'undefined'
  }

  if (value instanceof Set) {
    return 'set'
  }

  if (value instanceof Map) {
    return 'map'
  }

  if (Array.isArray(value)) {
    return 'array'
  }

  if (value instanceof Date) {
    return 'date'
  }

  if (value instanceof RegExp) {
    return 'regexp'
  }

  if (value instanceof Error) {
    return 'error'
  }

  if (value instanceof Promise) {
    return 'promise'
  }

  if (value instanceof ArrayBuffer) {
    return 'arraybuffer'
  }

  if (ArrayBuffer.isView(value)) {
    return 'typedarray' // Includes Int8Array, Uint8Array, etc.
  }

  if (value instanceof WeakSet) {
    return 'weakset'
  }

  if (value instanceof WeakMap) {
    return 'weakmap'
  }

  if (typeof value === 'function') {
    return 'function'
  }

  if (typeof value === 'symbol') {
    return 'symbol'
  }

  if (typeof value === 'bigint') {
    return 'bigint'
  }

  if (typeof value === 'object') {
    return 'object' // For plain objects
  }

  return typeof value // For primitive types like string, number, boolean, etc.
}

export default typeCheck