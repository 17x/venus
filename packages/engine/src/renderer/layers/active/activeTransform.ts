import type { EngineDrawCommand, EngineLayeredRenderInput } from '../../../render/index.ts'

const PREVIEW_MATRIX_M02_OFFSET = 2
const PREVIEW_MATRIX_M10_OFFSET = 3
const PREVIEW_MATRIX_M11_OFFSET = 4
const PREVIEW_MATRIX_M12_OFFSET = 5

/**
 * Applies preview transform to active command bounds when interaction provides one.
  * @param command command parameter.
 * @param input Input payload for this operation.
*/
export function applyActivePreviewTransform(
  command: EngineDrawCommand,
  input: EngineLayeredRenderInput,
): EngineDrawCommand {
  const matrix = input.interaction.previewTransform
  if (!matrix) {
    return command
  }

  const transformedOrigin = {
    x: matrix[0] * command.bounds.x + matrix[1] * command.bounds.y + matrix[PREVIEW_MATRIX_M02_OFFSET],
    y: matrix[PREVIEW_MATRIX_M10_OFFSET] * command.bounds.x + matrix[PREVIEW_MATRIX_M11_OFFSET] * command.bounds.y + matrix[PREVIEW_MATRIX_M12_OFFSET],
  }

  // Keep preview transform conservative by preserving width/height during phase-1 migration.
  return {
    ...command,
    bounds: {
      x: transformedOrigin.x,
      y: transformedOrigin.y,
      width: command.bounds.width,
      height: command.bounds.height,
    },
  }
}
