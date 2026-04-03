import {ToolType} from '~/services/tool/toolManager'
import resizeElements from '~/services/tool/resize/resizeElements'
import {DEFAULT_FONT, DEFAULT_STROKE, DEFAULT_TEXT_FILL} from '~/elements/defaultProps'
import {PropsWithoutIdentifiers} from '~/elements/type'

const textTool: ToolType = {
  cursor: 'text',
  mouseDown: function () {
    const {mainHost, interaction, world} = this.editor
    const {x, y} = interaction.mouseWorldCurrent
    const width = 1
    const height = 1
    const eleProps: PropsWithoutIdentifiers<'text'> = {
      type: 'text',
      content: [{
        text: 'hello',
        font: {...DEFAULT_FONT},
        fill: {...DEFAULT_TEXT_FILL},
        stroke: {...DEFAULT_STROKE},
      }],
      cx: x - width / 2,
      cy: y - height / 2,
      width,
      height,
    }
    const ele = mainHost.create(eleProps)

    if (ele) {
      ele.render(world.creationCanvasContext)
      interaction._ele = ele
    }
  },
  mouseMove: function () {
    const {action, mainHost, interaction, world} = this.editor

    if (!interaction._ele) return
    action.dispatch('clear-creation')

    resizeElements.call(this, [interaction._ele], 'br')
    interaction._ele.render(world.creationCanvasContext)
  },
  mouseUp: function () {
    const {action, mainHost, interaction, world} = this.editor

    const eleProps = interaction._ele.toMinimalJSON()

    action.dispatch('element-add', [eleProps])
    interaction._ele = null!
  },
}

export default textTool