function throttle<T extends (...args: any[]) => any>(
  func: T,
  delay: number,
): (...args: Parameters<T>) => ReturnType<T> {
  let lastCall = 0
  let timeoutId: ReturnType<typeof setTimeout> | undefined
  let lastResult: ReturnType<T>

  return (...args: Parameters<T>): ReturnType<T> => {
    const now = Date.now()

    const invoke = () => {
      lastCall = now
      lastResult = func(...args)
    }

    if (now - lastCall >= delay) {
      invoke()
    } else {
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId)
      }
      timeoutId = setTimeout(invoke, delay - (now - lastCall))
    }

    return lastResult
  }
}

export default throttle