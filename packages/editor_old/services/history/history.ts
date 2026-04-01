import Editor from '../../main/editor'
import DoublyLinkedList, {HistoryNode} from './DoublyLinkedList'
import {HistoryOperation} from './type'

class History extends DoublyLinkedList {
  private editor: Editor

  constructor(editor: Editor) {
    super()
    this.editor = editor
    this.init()
  }

  init() {
    this.append({
      type: 'history-init',
      payload: {
        state: null,
        selectedElements: new Set(),
      },
    })

    this.editor.events.onHistoryUpdated?.(this)
  }

  // Add a History node after the current
  add(data: HistoryOperation): void {
    this.detach()
    this.append(data)

  }

  toArray(): HistoryNode[] {
    const list: HistoryNode[] = []

    if (this.head) {
      let curr = this.head

      list.push(curr)

      while (curr.next) {
        list.push(curr.next)
        curr = curr.next
      }
    }

    return list
  }

  public compareToCurrentPosition(node: HistoryNode) {
    return super.compareToCurrentPosition(node)
  }

  public forward(): HistoryNode | false {
    return super.forward()
  }

  public back(): HistoryNode | false {
    return super.back()
  }
}

export default History


