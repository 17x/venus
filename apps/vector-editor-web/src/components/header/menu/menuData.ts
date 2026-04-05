import {MenuItemType} from './type'

export const fileMenu: MenuItemType = {
  id: 'file',
  disabled: false,
  children: [
    {id: 'newFile', disabled: false},
    {id: 'openFile', disabled: false},
    {id: 'saveFile', disabled: false},
    {id: 'saveAs', disabled: false},
    // {id: 'importFile', disabled: false},
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

export const editMenu: MenuItemType = {
  id: 'edit',
  disabled: false,
  children: [
    {id: 'undo', editorActionCode: 'history-undo', disabled: false},
    {id: 'redo', editorActionCode: 'history-redo', disabled: false},
    {id: 'cut', disabled: false},
    {id: 'copy', disabled: false},
    {id: 'paste', disabled: false},
    {
      id: 'delete', editorActionCode: 'element-delete',
      disabled: false,
    },
    {id: 'duplicate', disabled: false},
    {id: 'selectAll', disabled: false},
    {id: 'findReplace', disabled: false},
  ],
}

export const viewMenu: MenuItemType = {
  id: 'view',
  disabled: false,
  children: [
    {id: 'zoomIn', disabled: false},
    {id: 'zoomOut', disabled: false},
    {id: 'fitToScreen', disabled: false},
    {id: 'toggleGrid', disabled: false},
    {id: 'toggleGuides', disabled: false},
    {id: 'fullscreenMode', disabled: false},
  ],
}

export const shapeMenu: MenuItemType = {
  id: 'shape',
  disabled: false,
  children: [
    {id: 'addNode', disabled: false},
    {id: 'deleteNode', disabled: false},
    {id: 'moveNode', disabled: false},
    {id: 'resizeNode', disabled: false},
    {id: 'rotateNode', disabled: false},
    {id: 'changeNodeColor', disabled: false},
    {id: 'changeNodeBorder', disabled: false},
    {id: 'changeNodeText', disabled: false},
    {id: 'groupNodes', disabled: false},
    {id: 'ungroupNodes', disabled: false},
    {id: 'lockNode', disabled: false},
    {id: 'unlockNode', disabled: false},
  ],
}

export const connectionMenu: MenuItemType = {
  id: 'connection',
  disabled: false,
  children: [
    {id: 'addEdge', disabled: false},
    {id: 'deleteEdge', disabled: false},
    {id: 'changeEdgeStyle', disabled: false},
    {id: 'changeEdgeColor', disabled: false},
    {id: 'changeEdgeLabel', disabled: false},
    {id: 'reverseEdge', disabled: false},
  ],
}

export const textMenu: MenuItemType = {
  id: 'text',
  disabled: false,
  children: [
    {id: 'addText', disabled: false},
    {id: 'editText', disabled: false},
    {id: 'changeFont', disabled: false},
    {id: 'changeFontSize', disabled: false},
    {id: 'changeFontColor', disabled: false},
    {id: 'boldText', disabled: false},
    {id: 'italicText', disabled: false},
    {id: 'underlineText', disabled: false},
    {id: 'alignText', disabled: false},
  ],
}

export const layerMenu: MenuItemType = {
  id: 'layer',
  disabled: false,
  children: [
    {id: 'bringForward', editorActionCode: 'element-layer', editorActionData: 'up', disabled: false, icon: 'layerUp'},
    {id: 'sendBackward', editorActionCode: 'element-layer', editorActionData: 'down', disabled: false, icon: 'layerDown'},
    {id: 'bringToFront', editorActionCode: 'element-layer', editorActionData: 'top', disabled: false, icon: 'layerTop'},
    {id: 'sendToBack', editorActionCode: 'element-layer', editorActionData: 'bottom', disabled: false, icon: 'layerBottom'},
    {id: 'duplicateLayer', editorActionCode: 'element-duplicate', disabled: false},
    {id: 'deleteLayer', editorActionCode: 'element-delete', disabled: false},
    {id: 'toggleLayerVisibility', disabled: false},
  ],
}

export default [
  fileMenu,
  editMenu,
  viewMenu,
  layerMenu,
  // shapeMenu,
  // connectionMenu,
  // textMenu,
  // layerMenu,
]
