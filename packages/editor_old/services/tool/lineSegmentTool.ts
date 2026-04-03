import ToolManager, {ToolType} from '~/services/tool/toolManager'
import resizeElements from '~/services/tool/resize/resizeElements'
import ElementLineSegment from '~/elements/lines/lineSegment'
import {nid} from '~/index'

const lineSegmentTool: ToolType = {
  cursor: 'crosshair',
  mouseDown(this: ToolManager) {
    const {mainHost, action, cursor, overlayHost, interaction, world} = this.editor
    const {x, y} = interaction.mouseWorldCurrent
    let lineLen = 1

    const ele = ElementLineSegment.create('lineSegment-creating', x, y, x + lineLen, y + lineLen)

    cursor.lock()
    action.dispatch('rerender-overlay')
    ele.render(overlayHost.ctx)
    interaction._ele = ele
  },
  mouseMove(this: ToolManager) {
    const {action, interaction, cursor, overlayHost, world} = this.editor

    if (!interaction._ele) return

    // action.dispatch('clear-creation')

    resizeElements.call(this, [interaction._ele], 'br')
    action.dispatch('rerender-overlay')
    interaction._ele.render(overlayHost.ctx)
  },
  mouseUp(this: ToolManager) {
    const {action, interaction, cursor} = this.editor

    const eleProps = interaction._ele.toMinimalJSON()

    eleProps.id = nid()
    cursor.unlock()
    action.dispatch('element-add', [eleProps])
    interaction._ele = null!
  },
}

export default lineSegmentTool