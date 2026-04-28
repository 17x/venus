// Declares minimal node:test surface used by local strip-types tests.
declare module 'node:test' {
  // Declares one test callback signature.
  type TestCallback = () => void | Promise<void>

  // Declares default test registration function.
  export default function test(name: string, callback: TestCallback): void
}

// Declares minimal node:assert/strict surface used by local strip-types tests.
declare module 'node:assert/strict' {
  // Declares assertion API used by current test suites.
  interface StrictAssert {
    // Asserts strict deep equality.
    deepEqual(actual: unknown, expected: unknown): void
    // Asserts strict equality.
    equal(actual: unknown, expected: unknown): void
    // Asserts expression evaluates truthy.
    ok(value: unknown, message?: string): void
    // Asserts callback does not throw.
    doesNotThrow(callback: () => unknown): void
    // Asserts callback throws and optionally matches pattern.
    throws(callback: () => unknown, expected?: RegExp): void
    // Asserts value matches a regular expression.
    match(value: string, pattern: RegExp): void
  }

  // Exports strict assertion object.
  const assert: StrictAssert
  export default assert
}

