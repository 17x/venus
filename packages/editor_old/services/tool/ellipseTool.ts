import {ToolType} from '~/services/tool/toolManager'
import resizeElements from '~/services/tool/resize/resizeElements'
import {PropsWithoutIdentifiers} from '~/elements/type'
import ElementRectangle from '~/elements/rectangle/rectangle'
import ElementEllipse from '~/elements/ellipse/ellipse'
import {nid} from '~/index'

const ellipseTool: ToolType = {
  cursor: 'crosshair',
  mouseDown: function () {
    const {cursor,action,overlayHost, interaction} = this.editor
    const {x, y} = interaction.mouseWorldCurrent
    const r1 = 1
    const r2 = 1
    const cx = x - r1 / 2
    const cy = y - r2 / 2
    const ele: ElementEllipse = ElementEllipse.create('rectangle-creating', cx, cy, r1, r2)


    cursor.lock()
    action.dispatch('rerender-overlay')
    ele.render(overlayHost.ctx)
    interaction._ele = ele
  },
  mouseMove: function () {
    const {action, interaction, overlayHost} = this.editor

    if (!interaction._ele) return

    resizeElements.call(this, [interaction._ele], 'br')
    action.dispatch('rerender-overlay')
    interaction._ele.render(overlayHost.ctx)
  },
  mouseUp: function () {
    const {cursor, action, interaction} = this.editor

    const eleProps = interaction._ele.toMinimalJSON()
    eleProps.id = nid()
    cursor.unlock()
    action.dispatch('element-add', [eleProps])
    interaction._ele = null!
  },
}

export default ellipseTool