import type { EditorMenuItem } from '@venus/editor-ui'

const fileMenu: EditorMenuItem = {
  id: 'file',
  disabled: false,
  children: [
    { id: 'newFile', disabled: false },
    { id: 'openFile', disabled: false },
    { id: 'saveFile', disabled: false },
    { id: 'saveAs', disabled: false },
    {
      id: 'exportFile',
      disabled: false,
      children: [
        { id: 'exportFile_png', disabled: false },
        { id: 'exportFile_pdf', disabled: false },
        { id: 'exportFile_csv', disabled: false },
      ],
    },
    { id: 'print', disabled: false },
    { id: 'closeFile', disabled: false },
  ],
}

const editMenu: EditorMenuItem = {
  id: 'edit',
  disabled: false,
  children: [
    { id: 'undo', disabled: false },
    { id: 'redo', disabled: false },
    { id: 'cut', disabled: false },
    { id: 'copy', disabled: false },
    { id: 'paste', disabled: false },
    { id: 'delete', disabled: false },
    { id: 'duplicate', disabled: false },
    { id: 'selectAll', disabled: false },
    { id: 'findReplace', disabled: false },
  ],
}

const viewMenu: EditorMenuItem = {
  id: 'view',
  disabled: false,
  children: [
    { id: 'zoomIn', disabled: false },
    { id: 'zoomOut', disabled: false },
    { id: 'fitToScreen', disabled: false },
    { id: 'toggleGrid', disabled: false },
    { id: 'toggleGuides', disabled: false },
    { id: 'fullscreenMode', disabled: false },
  ],
}

export const WEB_EDITOR_MENU_TREE: EditorMenuItem[] = [
  fileMenu,
  editMenu,
  viewMenu,
]
