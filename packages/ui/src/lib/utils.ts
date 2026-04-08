type ClassDictionary = Record<string, boolean | null | undefined>
type ClassArray = ClassValue[]
type ClassValue = string | number | boolean | null | undefined | ClassDictionary | ClassArray

export function cn(...inputs: ClassValue[]) {
  return inputs.flatMap(resolveClassValue).join(' ')
}

function resolveClassValue(input: ClassValue): string[] {
  if (!input || typeof input === 'boolean') {
    return []
  }

  if (typeof input === 'string' || typeof input === 'number') {
    return [String(input)]
  }

  if (Array.isArray(input)) {
    return input.flatMap(resolveClassValue)
  }

  return Object.entries(input)
    .filter(([, enabled]) => Boolean(enabled))
    .map(([className]) => className)
}
