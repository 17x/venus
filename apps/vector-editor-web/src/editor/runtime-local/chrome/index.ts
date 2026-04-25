import type {RuntimeEditingMode} from '../editing-modes/index.ts'

export type RuntimeSelectionChromeKind =
  | 'transform-box'
  | 'path-edit'
  | 'text-edit'
  | 'group-frame'
  | 'mask-source'
  | 'hidden'

export interface RuntimeSelectionChromeState {
  readonly kind: RuntimeSelectionChromeKind
  readonly hideBounds: boolean
  readonly hideTransformHandles: boolean
}

export interface RuntimeSelectionChromeInput {
  readonly nodeType?: string | null
  readonly editingMode?: RuntimeEditingMode | null
  readonly isMaskedImageHost?: boolean
}

export interface RuntimeSelectionChromeResolver {
  resolve(input: RuntimeSelectionChromeInput): RuntimeSelectionChromeState
}

export function createRuntimeSelectionChromeRegistry(): RuntimeSelectionChromeResolver {
  return {
    resolve(input) {
      if (input.isMaskedImageHost) {
        return {
          kind: 'mask-source',
          hideBounds: true,
          hideTransformHandles: false,
        }
      }

      if (input.editingMode === 'pathEditing' || input.nodeType === 'path') {
        return {
          kind: 'path-edit',
          hideBounds: input.editingMode === 'pathEditing',
          hideTransformHandles: input.editingMode === 'pathEditing',
        }
      }

      if (input.editingMode === 'textEditing') {
        return {
          kind: 'text-edit',
          hideBounds: false,
          hideTransformHandles: true,
        }
      }

      if (input.nodeType === 'group') {
        return {
          kind: 'group-frame',
          hideBounds: false,
          hideTransformHandles: false,
        }
      }

      return {
        kind: 'transform-box',
        hideBounds: false,
        hideTransformHandles: false,
      }
    },
  }
}