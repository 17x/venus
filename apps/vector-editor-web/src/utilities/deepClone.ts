
interface CloneOptions {
  clonePrototype?: boolean;
}

function deepClone<T>(obj: T, options: CloneOptions = {}): T {
  if (typeof obj !== 'object' || obj === null) {
    return obj
  }

  if (Array.isArray(obj)) {
    return obj.map(item => deepClone(item, options)) as T
  }

  const clone = Object.create(options.clonePrototype ? Object.getPrototypeOf(obj) : null)

  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      clone[key] = deepClone(obj[key], options)
    }
  }

  return clone
}

export default deepClone