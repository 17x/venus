import type {CursorRuntime} from './CursorManager.ts'

/**
 * Applies resolved cursor runtime to a DOM element.
 */
export function applyCursorToElement(
  element: HTMLElement,
  runtime: Pick<CursorRuntime, 'css'>,
): void {
  // Skip DOM writes when value is unchanged to reduce style invalidations.
  if (element.style.cursor === runtime.css) {
    return
  }

  element.style.cursor = runtime.css
}

