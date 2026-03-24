// import {VisionEventType} from '@lite-u/editor/types'

export interface ActionItemType {
  id: string
  // action?: VisionEventType,
  shortcut: string
  // editorAction?: VisionEventType,
  editorActionData?: string
  disabled?: boolean
  icon?: string
  divide?: boolean
  children?: ActionItemType[]
}

export const FILE = {
  id: 'file',
  disabled: false,
  children: [
    {id: 'newFile', disabled: false, shortcut: 'ctrl+n'},
    {id: 'openFile', disabled: false, shortcut: 'ctrl+o'},
    {id: 'importFile', disabled: false},
    {id: 'saveFile', shortcut: 'ctrl+s,meta+s'},
    {id: 'saveAs', disabled: false},
    {
      id: 'exportFile',
      disabled: false,
      children: [
        {id: 'exportFile_png', disabled: false},
        {id: 'exportFile_pdf', disabled: false},
        {id: 'exportFile_csv', disabled: false},
      ],
    },
    {id: 'print', disabled: false},
    {id: 'closeFile', disabled: false},
  ],
}

export const EDIT = {
  id: 'edit',
  children: [
    {id: 'undo', disabled: false, editorAction: 'history-undo', shortcut: 'ctrl+z,meta+z'},
    {id: 'redo', disabled: false, editorAction: 'history-redo', shortcut: 'ctrl+shift+z,meta+shift+z'},
    {id: 'cut', disabled: false, editorAction: 'element-cut', shortcut: 'ctrl+x,meta+x'},
    {id: 'copy', disabled: false, editorAction: 'element-copy', shortcut: 'ctrl+c,meta+c'},
    {id: 'paste', disabled: false, editorAction: 'element-paste', shortcut: 'ctrl+v,meta+v'},
    {id: 'delete', disabled: false, editorAction: 'element-delete', shortcut: 'delete,backspace'},
    {id: 'duplicate', disabled: false, editorAction: 'element-duplicate', shortcut: 'ctrl+d,meta+d'},
    {id: 'selectAll', disabled: false, editorAction: 'selection-all', shortcut: 'ctrl+a,meta+a'},
    {id: 'elementMoveUp', disabled: false, editorAction: 'element-move-up', shortcut: 'arrowup'},
    {id: 'elementMoveRight', disabled: false, editorAction: 'element-move-right', shortcut: 'arrowright'},
    {id: 'elementMoveDown', disabled: false, editorAction: 'element-move-down', shortcut: 'arrowdown'},
    {id: 'elementMoveLeft', disabled: false, editorAction: 'element-move-left', shortcut: 'arrowleft'},
    // {id: 'findReplace', editorAction: 'history-redo', shortcut: 'ctrl+f'},
  ],
}

export const VIEW = {
  id: 'view',
  disabled: false,
  children: [
    {id: 'zoomIn', disabled: false, shortcut: 'ctrl+=,meta+='},
    {id: 'zoomOut', disabled: false, shortcut: 'ctrl+-,meta+-'},
    {id: 'zoomFit', disabled: false, shortcut: 'f4,ctrl+0,meta+0'},
    // {id: 'toggleGrid'},
    // {id: 'toggleGuides'},
    // {id: 'fullscreenMode', shortcut: 'F11'},
  ],
}

export const TEXT = {
  id: 'text',
  disabled: false,
  children: [
    {id: 'addText', disabled: false},
    {id: 'editText', disabled: false},
    {id: 'changeFont', disabled: false},
    {id: 'changeFontSize', disabled: false},
    {id: 'changeFontColor', disabled: false},
    {id: 'boldText', disabled: false, shortcut: 'ctrl+b,meta+b'},
    {id: 'italicText', disabled: false, shortcut: 'ctrl+i,meta+i'},
    {id: 'underlineText', disabled: false, shortcut: 'ctrl+u,meta+u'},
    {id: 'alignText', disabled: false},
  ],
}

export const LAYER = {
  id: 'layer',
  disabled: false,
  children: [
    {id: 'sendToBack', editorAction: ''},
    {id: 'bringToFront', editorAction: ''},
    {id: 'sendBackward', editorAction: '', shortcut: 'shift+meta+]'},
    {id: 'bringForward', editorAction: '', shortcut: 'shift+meta+['},
    // {id: 'duplicateLayer', editorAction: ''},
    // {id: 'deleteLayer', editorAction: ''},
  ],
}

export const TOOLS = {
  id: 'tools',
  children: [
    {id: 'selectorTool', shortcut: 'v', editorAction: 'switch-tool', editorActionData: 'selector'},
    {id: 'dSelectorTool', shortcut: 'a', editorAction: 'switch-tool', editorActionData: 'dselector'},
    {id: 'lineSegmentTool', shortcut: '\\', editorAction: 'switch-tool', editorActionData: 'lineSegment'},
    {id: 'rectangleTool', shortcut: 'm', editorAction: 'switch-tool', editorActionData: 'rectangle'},
    {id: 'ellipseTool', shortcut: 'l', editorAction: 'switch-tool', editorActionData: 'ellipse'},
    {id: 'textTool', shortcut: 't', editorAction: 'switch-tool', editorActionData: 'text'},
    {id: 'pencilTool', shortcut: 'p', editorAction: 'switch-tool', editorActionData: 'pencil'},
    {id: 'panningTool', shortcut: 'h', editorAction: 'switch-tool', editorActionData: 'panning'},
    {id: 'zoomInTool', shortcut: 'z', editorAction: 'switch-tool', editorActionData: 'zoomIn'},
    {id: 'escape', shortcut: 'escape', editorAction: 'escape-action'},
  ],
}

export default [FILE, EDIT, VIEW, TEXT, LAYER, TOOLS]