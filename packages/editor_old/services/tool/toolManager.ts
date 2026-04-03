import Editor from '~/main/editor'
import handleMouseUp from '~/services/tool/baseEvents/pointerUp'
import handleKeyDown from '~/services/tool/baseEvents/keyDown'
import handleKeyUp from '~/services/tool/baseEvents/keyUp'
import handlePointerMove from '~/services/tool/baseEvents/pointerMove'
import handleContextMenu from '~/services/tool/baseEvents/contextMenu'
import handleMouseDown from '~/services/tool/baseEvents/pointerDown'
import {CursorName} from '~/services/cursor/cursor'
import selector from '~/services/tool/selector/selector'
import dSelector from '~/services/tool/dselector/dselector'
import panning from '~/services/tool/panning/panning'
import rectangleTool from '~/services/tool/rectangle/rectangleTool'
import ellipseTool from '~/services/tool/ellipseTool'
import textTool from '~/services/tool/textTool'
import lineSegmentTool from '~/services/tool/lineSegmentTool'
import pencilTool from '~/services/tool/pencil/pencilTool'
import {zoomInTool, zoomOutTool} from '~/services/tool/zoomTool'
import {CanvasHostEvent} from '~/services/element/CanvasHost'

export type ToolType = {
  cursor: CursorName
  init?: (this: ToolManager) => unknown
  mouseDown?: (this: ToolManager, event: CanvasHostEvent) => void
  mouseMove: (this: ToolManager, event: CanvasHostEvent) => unknown
  mouseUp: (this: ToolManager, event: CanvasHostEvent) => void
}
export type SubToolType = Omit<ToolType, 'mouseDown' | 'cursor'> & { cursor?: CursorName }
export type ToolName =
  'selector'
  | 'dselector'
  | 'rectangle'
  | 'text'
  | 'ellipse'
  | 'panning'
  | 'lineSegment'
  | 'path'
  | 'pencil'
  | 'zoomIn'
  | 'zoomOut'

class ToolManager {
  editor: Editor
  eventsController = new AbortController()
  toolMap: Map<ToolName, ToolType> = new Map()
  tool: ToolType
  subTool: SubToolType | null = null
  currentToolName: ToolName

  constructor(editor: Editor) {
    const {signal} = this.eventsController
    // const {container} = editor

    this.editor = editor

    // window.addEventListener('wheel', handleWheel.bind(this), {signal, passive: false})
    window.addEventListener('keydown', handleKeyDown.bind(this), {signal})
    window.addEventListener('keyup', handleKeyUp.bind(this), {signal})

    editor.overlayHost.onmousedown = handleMouseDown.bind(this)
    editor.overlayHost.onmouseup = handleMouseUp.bind(this)
    editor.overlayHost.onmousemove = handlePointerMove.bind(this)
    editor.overlayHost.oncontextmenu = handleContextMenu.bind(this)
    // container.addEventListener('pointerdown', handleMouseDown.bind(this), {signal, passive: false})
    // container.addEventListener('pointerup', handleMouseUp.bind(this), {signal})
    // container.addEventListener('pointermove', handlePointerMove.bind(this), {signal})
    // container.addEventListener('contextmenu', handleContextMenu.bind(this), {signal})

    this.toolMap.set('selector', selector)
    this.toolMap.set('dselector', dSelector)
    this.toolMap.set('panning', panning)
    this.toolMap.set('rectangle', rectangleTool)
    this.toolMap.set('ellipse', ellipseTool)
    this.toolMap.set('text', textTool)
    this.toolMap.set('lineSegment', lineSegmentTool)
    this.toolMap.set('zoomIn', zoomInTool)
    this.toolMap.set('zoomOut', zoomOutTool)
    this.toolMap.set('pencil', pencilTool)

    this.currentToolName = 'selector'
    this.tool = selector
  }

  set(name: ToolName) {
    const tool = this.toolMap.get(name)
    console.log(tool)
    if (tool) {
      this.currentToolName = name
      this.tool = tool
      this.editor.cursor.set(tool.cursor)
      // tool.init?.call(this.editor)
    }
  }

  destroy() {
    this.eventsController.abort()
    this.eventsController = null!
    this.editor = null!
    this.toolMap.clear()
    this.toolMap = null!
    this.tool = null!
    this.currentToolName = null!
  }
}

export default ToolManager