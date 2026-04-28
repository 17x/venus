import type {DocumentNode} from '../../model/index.ts'
import type {ElementProps} from '../../types/index.ts'

type ElementTextRun = NonNullable<DocumentNode['textRuns']>[number]

/**
 * Resolves canonical text content for text elements.
 * @param element Source file element.
 */
export function resolveTextContent(element: ElementProps) {
  if (element.type !== 'text') {
    return undefined
  }

  if (typeof element.text === 'string') {
    return element.text
  }

  return String(element.name ?? 'Text')
}

/**
 * Parses text run payloads from one file element.
 * @param element Source file element.
 */
export function resolveTextRuns(element: ElementProps): DocumentNode['textRuns'] {
  if (element.type !== 'text') {
    return undefined
  }

  const candidate = (element as ElementProps & {textRuns?: unknown}).textRuns
  if (!Array.isArray(candidate) || candidate.length === 0) {
    return undefined
  }

  return candidate
    .map((run) => toTextRun(run))
    .filter((run): run is ElementTextRun => run !== null)
}

/**
 * Converts unknown run payloads into validated editor text runs.
 * @param value Unknown run value.
 */
function toTextRun(value: unknown): ElementTextRun | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  const run = value as {
    start?: unknown
    end?: unknown
    style?: {
      color?: unknown
      fontFamily?: unknown
      fontSize?: unknown
      fontWeight?: unknown
      letterSpacing?: unknown
      lineHeight?: unknown
      textAlign?: unknown
      verticalAlign?: unknown
    }
  }

  if (typeof run.start !== 'number' || typeof run.end !== 'number') {
    return null
  }

  const style = run.style && typeof run.style === 'object'
    ? {
        color: typeof run.style.color === 'string' ? run.style.color : undefined,
        fontFamily: typeof run.style.fontFamily === 'string' ? run.style.fontFamily : undefined,
        fontSize: typeof run.style.fontSize === 'number' ? run.style.fontSize : undefined,
        fontWeight: typeof run.style.fontWeight === 'number' ? run.style.fontWeight : undefined,
        letterSpacing: typeof run.style.letterSpacing === 'number' ? run.style.letterSpacing : undefined,
        lineHeight: typeof run.style.lineHeight === 'number' ? run.style.lineHeight : undefined,
        textAlign: resolveTextAlign(run.style.textAlign),
        verticalAlign: resolveVerticalAlign(run.style.verticalAlign),
      }
    : undefined

  return {
    start: Math.max(0, Math.floor(run.start)),
    end: Math.max(0, Math.floor(run.end)),
    style,
  }
}

/**
 * Validates horizontal text alignment literals.
 * @param value Candidate alignment value.
 */
function resolveTextAlign(value: unknown): 'left' | 'center' | 'right' | undefined {
  if (value === 'left' || value === 'center' || value === 'right') {
    return value
  }
  return undefined
}

/**
 * Validates vertical text alignment literals.
 * @param value Candidate alignment value.
 */
function resolveVerticalAlign(value: unknown): 'top' | 'middle' | 'bottom' | undefined {
  if (value === 'top' || value === 'middle' || value === 'bottom') {
    return value
  }
  return undefined
}
