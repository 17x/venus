import {ElementProps} from '~/elements/type'

class ClipboardManager {
  copiedItems: ElementProps[] = []
  CopyDeltaX = 10
  CopyDeltaY = 10

  copy() {}

  paste() {}

  updateCopiedItemsDelta(): void {
/*    this.copiedItems.forEach((copiedItem) => {
      copiedItem!.x += this.CopyDeltaX
      copiedItem!.y += this.CopyDeltaY
    })*/
  }

  destroy() {

  }
}

export default ClipboardManager