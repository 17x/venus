import type {ElementProps} from '../../types/index.ts'

// Resolves canonical text content for TEXT feature export.
export function resolveTextContent(element: ElementProps) {
  if (typeof element.text === 'string') {
    return element.text
  }

  return String(element.name ?? 'Text')
}

// Normalizes optional rich text-run payload into runtime TEXT run records.
export function resolveTextRuns(
  element: ElementProps,
  text: string,
) {
  const candidate = (element as ElementProps & {textRuns?: unknown}).textRuns
  if (!Array.isArray(candidate) || candidate.length === 0) {
    return []
  }

  const textLength = text.length

  return candidate
    .map((run) => normalizeTextRun(run, textLength))
    .filter((run): run is NonNullable<ReturnType<typeof normalizeTextRun>> => run !== null)
}

// Normalizes one text-run payload and clamps range within current text length.
function normalizeTextRun(value: unknown, textLength: number) {
  if (!value || typeof value !== 'object') {
    return null
  }

  const run = value as Record<string, unknown>
  if (typeof run.start !== 'number' || typeof run.end !== 'number') {
    return null
  }

  const start = Math.max(0, Math.min(textLength, Math.floor(run.start)))
  const end = Math.max(start, Math.min(textLength, Math.floor(run.end)))
  const style = run.style && typeof run.style === 'object'
    ? (run.style as Record<string, unknown>)
    : undefined
  const shadow = style?.shadow && typeof style.shadow === 'object'
    ? (style.shadow as Record<string, unknown>)
    : undefined

  return {
    start,
    end,
    color: typeof style?.color === 'string' ? style.color : '#111111',
    fontFamily: typeof style?.fontFamily === 'string' ? style.fontFamily : 'Arial, sans-serif',
    fontSize: typeof style?.fontSize === 'number' ? style.fontSize : 16,
    fontWeight: typeof style?.fontWeight === 'number' ? style.fontWeight : 400,
    fontStyle: resolveFontStyle(style?.fontStyle),
    letterSpacing: typeof style?.letterSpacing === 'number' ? style.letterSpacing : 0,
    lineHeight: typeof style?.lineHeight === 'number' ? style.lineHeight : 20,
    textAlign: resolveTextAlign(style?.textAlign),
    verticalAlign: resolveVerticalAlign(style?.verticalAlign),
    shadowColor: typeof shadow?.color === 'string' ? shadow.color : undefined,
    shadowOffsetX: typeof shadow?.offsetX === 'number' ? shadow.offsetX : undefined,
    shadowOffsetY: typeof shadow?.offsetY === 'number' ? shadow.offsetY : undefined,
    shadowBlur: typeof shadow?.blur === 'number' ? shadow.blur : undefined,
  }
}

// Validates font style literals before exporting runtime TEXT features.
function resolveFontStyle(value: unknown): 'normal' | 'italic' | 'oblique' | undefined {
  if (value === 'normal' || value === 'italic' || value === 'oblique') {
    return value
  }
  return undefined
}

// Validates horizontal text alignment literals before exporting TEXT features.
function resolveTextAlign(value: unknown): 'left' | 'center' | 'right' | undefined {
  if (value === 'left' || value === 'center' || value === 'right') {
    return value
  }
  return undefined
}

// Validates vertical text alignment literals before exporting TEXT features.
function resolveVerticalAlign(value: unknown): 'top' | 'middle' | 'bottom' | undefined {
  if (value === 'top' || value === 'middle' || value === 'bottom') {
    return value
  }
  return undefined
}
