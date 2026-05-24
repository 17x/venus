/**
 * Asserts one runtime condition and throws with explicit message when false.
  * @param condition condition parameter.
 * @param message message parameter.
*/
export function assertEngineCondition(
  condition: boolean,
  message: string,
): asserts condition {
  if (condition) {
    return
  }

  throw new Error(message)
}
