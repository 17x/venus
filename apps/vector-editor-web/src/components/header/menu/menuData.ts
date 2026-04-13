import {MenuItemType} from './type'

export function createHeaderMenuData(options: {
  selectedIds: string[]
  copiedCount: number
  needSave: boolean
  historyStatus: {
    hasPrev: boolean
    hasNext: boolean
  }
}): MenuItemType[] {
  const noSelectedElement = options.selectedIds.length === 0
  const canGroup = options.selectedIds.length >= 2
  const canAlign = options.selectedIds.length >= 2
  const canDistribute = options.selectedIds.length >= 3

  return [
    {
      id: 'file',
      disabled: false,
      children: [
        {id: 'newFile', action: 'newFile', disabled: false},
        {id: 'saveFile', action: 'saveFile', disabled: !options.needSave},
        {id: 'print', action: 'print', disabled: false},
        {id: 'closeFile', action: 'closeFile', disabled: false},
      ],
    },
    {
      id: 'edit',
      disabled: false,
      children: [
        {id: 'undo', editorActionCode: 'history-undo', disabled: !options.historyStatus.hasPrev},
        {id: 'redo', editorActionCode: 'history-redo', disabled: !options.historyStatus.hasNext},
        {id: 'cut', editorActionCode: 'element-cut', disabled: noSelectedElement},
        {id: 'copy', editorActionCode: 'element-copy', disabled: noSelectedElement},
        {id: 'paste', editorActionCode: 'element-paste', disabled: options.copiedCount === 0},
        {id: 'duplicate', editorActionCode: 'element-duplicate', disabled: noSelectedElement},
        {id: 'delete', editorActionCode: 'element-delete', disabled: noSelectedElement},
        {id: 'selectAll', editorActionCode: 'selection-all', disabled: false},
      ],
    },
    {
      id: 'shape',
      disabled: false,
      children: [
        {id: 'groupNodes', editorActionCode: 'group-nodes', disabled: !canGroup},
        {id: 'ungroupNodes', editorActionCode: 'ungroup-nodes', disabled: noSelectedElement},
        {id: 'convertToPath', editorActionCode: 'convert-to-path', disabled: noSelectedElement},
        {
          id: 'align',
          disabled: !canAlign,
          children: [
            {id: 'alignLeft', editorActionCode: 'align-left', disabled: !canAlign},
            {id: 'alignCenterHorizontal', editorActionCode: 'align-center-horizontal', disabled: !canAlign},
            {id: 'alignRight', editorActionCode: 'align-right', disabled: !canAlign},
            {id: 'alignTop', editorActionCode: 'align-top', disabled: !canAlign},
            {id: 'alignMiddle', editorActionCode: 'align-middle', disabled: !canAlign},
            {id: 'alignBottom', editorActionCode: 'align-bottom', disabled: !canAlign},
          ],
        },
        {
          id: 'distribute',
          disabled: !canDistribute,
          children: [
            {id: 'distributeHorizontal', editorActionCode: 'distribute-horizontal', disabled: !canDistribute},
            {id: 'distributeVertical', editorActionCode: 'distribute-vertical', disabled: !canDistribute},
          ],
        },
        {id: 'maskWithShape', editorActionCode: 'image-mask-with-shape', disabled: noSelectedElement},
        {id: 'clearMask', editorActionCode: 'image-clear-mask', disabled: noSelectedElement},
      ],
    },
    {
      id: 'layer',
      disabled: false,
      children: [
        {id: 'bringForward', editorActionCode: 'element-layer', editorActionData: 'up', disabled: noSelectedElement, icon: 'layerUp'},
        {id: 'sendBackward', editorActionCode: 'element-layer', editorActionData: 'down', disabled: noSelectedElement, icon: 'layerDown'},
        {id: 'bringToFront', editorActionCode: 'element-layer', editorActionData: 'top', disabled: noSelectedElement, icon: 'layerTop'},
        {id: 'sendToBack', editorActionCode: 'element-layer', editorActionData: 'bottom', disabled: noSelectedElement, icon: 'layerBottom'},
        {id: 'duplicateLayer', editorActionCode: 'element-duplicate', disabled: noSelectedElement},
        {id: 'deleteLayer', editorActionCode: 'element-delete', disabled: noSelectedElement},
      ],
    },
  ]
}
