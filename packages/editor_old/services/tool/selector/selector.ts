import {ToolType} from '~/services/tool/toolManager'
import rotating from '~/services/tool/selector/rotating/rotating'
import selecting from '~/services/tool/selector/selecting/selecting'
import dragging from '~/services/tool/selector/dragging/dragging'
import resizing from '~/services/tool/selector/resizing/resizing'

const selector: ToolType = {
  cursor: 'default',
  init: function () { },
  mouseDown: function (event) {
    const {interaction, selection, cursor} = this.editor

    // console.log(event)

    if (interaction._rotateData) {
      this.subTool = rotating
      return

    } else if (interaction._draggingElements.length > 0) {
      this.subTool = dragging
      return

    } else if (interaction._resizingData) {
      this.subTool = resizing
      return

    }

    // console.log(this.subTool)

    // selecting.mouseDown(event)
    // console.log(event.element)
    this.subTool = selecting
    cursor.lock()

    /*
        // const {_hoveredElement} = interaction

        const rotateMode = !!interaction._hoveredRotateManipulator
        const resizeMode = !!interaction._hoveredResizeManipulator

        if (resizeMode) {
          const placement = interaction._hoveredResizeManipulator.id.replace('handle-resize-', '')
          cursor.set('resize')
          this.subTool = resizing

          interaction._resizingData = {placement}

          cursor.set('resize')
          this.subTool = resizing
        } else if (rotateMode) {
          const rects = elementManager.getElementsByIdSet(selection.values).map(ele => {
            return ele.getBoundingRect(true)
          })
          const center = getBoundingRectFromBoundingRects(rects)
          const {cx: x, cy: y} = center

          console.log(interaction._hoveredElement)
          interaction._rotateData = {startRotation: interaction._outlineElement.rotation, targetPoint: {x, y}}
          this.subTool = rotating
        } */
  },
  mouseMove: function () {
    // console.log('moving')
    const {interaction, cursor} = this.editor
    // console.log(this)
    // console.log('m')
    this.subTool?.mouseMove.call(this)

    /* if (interaction._rotateData) {
       rotating.mouseMove.call(this)
       return
     }

     if (!this.toolManager.subTool) {
       if (interaction._hoveredResizeManipulator) {
         cursor.set('nw-resize')
         // console.log(10)
       } else if (interaction._hoveredRotateManipulator) {
         // console.log(interaction._hoveredRotateManipulator.id)
         const centerPoint = {
           x: interaction.selectedOutlineElement.cx,
           y: interaction.selectedOutlineElement.cy,
         }

         const rotation = getRotateAngle(centerPoint, interaction.mouseWorldCurrent)
         cursor.set('rotate')
         cursor.rotate(rotation)
         // console.log(10)
       } else {
         // cursor.set(selector.cursor)
       }
     }*/
    // if (!this.subTool) return
  },
  mouseUp() {
    this.editor.cursor.unlock()
    this.editor.cursor.set(selector.cursor)

    this.editor.toolManager.subTool?.mouseUp.call(this)

    this.editor.cursor.set(selector.cursor)
    this.editor.toolManager.subTool = null
  },
}

export default selector