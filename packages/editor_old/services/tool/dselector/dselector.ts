import {ToolType} from '~/services/tool/toolManager'
import selecting from './selecting/selecting'

const dSelector: ToolType = {
  cursor: 'default',
  init() {

  },
  mouseDown() {
    this.subTool = selecting

    // this.interaction._movingHandle = this.interaction._hoveredHandle
  },
  mouseMove() {
    this.subTool?.mouseMove.call(this)

    /* if (!this.interaction._movingHandle) return
     const {interaction} = this

     // this.container.setPointerCapture(e.pointerId)
     const {x, y} = interaction.mouseWorldMovement

     this.interaction._movingHandle.translate(x, y)*/
  },
  mouseUp() {
    this.subTool?.mouseUp.call(this)
    this.editor.cursor.unlock()
    this.editor.cursor.set(dSelector.cursor)

    this.editor.toolManager.subTool?.mouseUp.call(this)

    this.editor.cursor.set(dSelector.cursor)
    this.editor.toolManager.subTool = null
    // this.interaction._movingHandle = null
    // this.cursor.set('grab')
  },
}

export default dSelector