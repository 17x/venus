import ToolManager from '~/services/tool/toolManager'
import {CanvasHostEvent} from '~/services/element/CanvasHost'

function handleMouseUp(this: ToolManager, e: CanvasHostEvent) {
  // const {button, target} = e.originalEvent

  this.tool.mouseUp.call(this, e)
  // this.action.dispatch('clear-creation')
  this.editor.interaction.mouseDelta = {x: 0, y: 0}
  this.editor.interaction.mouseWorldDelta = {x: 0, y: 0}
  this.editor.action.dispatch('world-mouse-up')
  this.editor.interaction._pointDown = false
}

export default handleMouseUp
