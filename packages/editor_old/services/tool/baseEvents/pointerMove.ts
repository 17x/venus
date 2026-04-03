import ToolManager from '~/services/tool/toolManager'
import snapTool from '~/services/tool/snap/snap'
import {CanvasHostEvent} from '~/services/element/CanvasHost'

export default function handlePointerMove(this: ToolManager, e: CanvasHostEvent) {
  const {button, shiftKey, metaKey, ctrlKey, altKey, movementX, movementY, clientX, clientY} = e.originalEvent
  const {action, rect, cursor, interaction, world} = this.editor
  const {dpr, scale} = world
  const x = clientX - rect!.x
  const y = clientY - rect!.y
  const stopSnap = this.currentToolName === 'zoomIn' || this.currentToolName === 'zoomOut' || this.currentToolName === 'panning'

  interaction.mouseCurrent = {x, y}
  interaction.mouseWorldCurrent = world.getWorldPointByViewportPoint(x, y)
  interaction.mouseWorldMovement = {x: movementX * dpr / scale, y: movementY * dpr / scale}
  interaction._modifier = {button, shiftKey, metaKey, ctrlKey, altKey, movementX, movementY}

  if (interaction._pointDown) {
    interaction.mouseDelta.x = x - interaction.mouseStart.x
    interaction.mouseDelta.y = y - interaction.mouseStart.y
    interaction.mouseWorldDelta = world.getWorldPointByViewportPoint(x, y)
  }

  cursor.move({x: clientX, y: clientY})

  if (stopSnap) {
    interaction._snappedPoint = null
    interaction._hoveredElement = null
  } else {
    // detectTool.call(this)
    snapTool.call(this)
  }

  // console.log(interaction._snappedPoint)
  action.dispatch('world-mouse-move')
  // action.dispatch('render-overlay')

  // console.log('this.tool',this.tool)
  this.tool.mouseMove.call(this)
}
