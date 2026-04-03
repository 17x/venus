// import {applyResize} from './helper'
import ToolManager from '~/services/tool/toolManager'

// import {updateSelectionBox} from "../domManipulations.ts"

function handleKeyDown(this: ToolManager, e: KeyboardEvent) {
  const {shiftKey, metaKey, ctrlKey, altKey} = e
  const {interaction} = this.editor

  if (e.code !== 'Space') {
    interaction._modifier = {...interaction._modifier, shiftKey, metaKey, ctrlKey, altKey}
    this.tool.mouseMove.call(this)
  }

}

export default handleKeyDown

