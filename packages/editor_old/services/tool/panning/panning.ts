import {ToolType} from '~/services/tool/toolManager'

const panning: ToolType = {
  cursor: 'grab',
  mouseDown() {
    this.editor.cursor.set('grabbing')
    // updateCursor.call(this, 'grabbing')
  },
  mouseMove() {
    // this.container.setPointerCapture(e.pointerId)
    const {_modifier, _pointDown} = this.editor.interaction
    const {movementX, movementY} = _modifier

    if (!_pointDown) return
    this.editor.action.dispatch('world-shift',
      {
        x: movementX,
        y: movementY,
      })
  },
  mouseUp() {
    this.editor.cursor.set('grab')
  },
}

export default panning