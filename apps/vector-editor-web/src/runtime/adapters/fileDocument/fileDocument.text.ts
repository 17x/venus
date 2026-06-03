import type {DocumentNode} from '../../model/index.ts'
import type {ElementProps} from '../../types/index.ts'

type ElementTextRun = NonNullable<DocumentNode['textRuns']>[number]
type TextRunStyleInput = {
  color?: unknown
  fontFamily?: unknown
  fontSize?: unknown
  fontWeight?: unknown
  fontStyle?: unknown
  letterSpacing?: unknown
  lineHeight?: unknown
  textAlign?: unknown
  verticalAlign?: unknown
  textDecoration?: unknown
}

/**
 * Resolves canonical text content for text elements.
 * @param element Source file element.
 */
export function resolveTextContent(element: ElementProps) {
  if (typeof element.text === 'string') {
    return element.text
  }

  if (element.type === 'text') {
    return String(element.name ?? 'Text')
  }

  return undefined
}

/**
 * Parses text run payloads from one file element.
 * @param element Source file element.
 */
export function resolveTextRuns(element: ElementProps): DocumentNode['textRuns'] {
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
    style?: TextRunStyleInput
  }

  if (typeof run.start !== 'number' || typeof run.end !== 'number') {
    return null
  }

  const style = run.style && typeof run.style === 'object'
    ? resolveTextRunStyle(run.style)
    : undefined

  return {
    start: Math.max(0, Math.floor(run.start)),
    end: Math.max(0, Math.floor(run.end)),
    style,
  }
}

function resolveTextRunStyle(style: TextRunStyleInput): ElementTextRun['style'] {
  const resolved: NonNullable<ElementTextRun['style']> = {}
  if (typeof style.color === 'string') {
    resolved.color = style.color
  }
  if (typeof style.fontFamily === 'string') {
    resolved.fontFamily = style.fontFamily
  }
  if (typeof style.fontSize === 'number') {
    resolved.fontSize = style.fontSize
  }
  if (typeof style.fontWeight === 'number') {
    resolved.fontWeight = style.fontWeight
  }
  if (style.fontStyle === 'normal' || style.fontStyle === 'italic') {
    resolved.fontStyle = style.fontStyle
  }
  if (typeof style.letterSpacing === 'number') {
    resolved.letterSpacing = style.letterSpacing
  }
  if (typeof style.lineHeight === 'number') {
    resolved.lineHeight = style.lineHeight
  }
  const textAlign = resolveTextAlign(style.textAlign)
  if (textAlign) {
    resolved.textAlign = textAlign
  }
  const verticalAlign = resolveVerticalAlign(style.verticalAlign)
  if (verticalAlign) {
    resolved.verticalAlign = verticalAlign
  }
  const textDecoration = resolveTextDecoration(style.textDecoration)
  if (textDecoration) {
    resolved.textDecoration = textDecoration
  }
  return resolved
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

/**
 * Validates text decoration literals.
 * @param value Candidate decoration value.
 */
function resolveTextDecoration(value: unknown): 'none' | 'underline' | 'strikethrough' | undefined {
  if (value === 'none' || value === 'underline' || value === 'strikethrough') {
    return value
  }
  return undefined
}
