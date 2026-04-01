import {HistoryNext, HistoryOperation, HistoryPrev} from './type'

class HistoryNode {
  data: HistoryOperation
  prev: HistoryPrev
  next: HistoryNext
  id: number

  constructor(prev: HistoryPrev, next: HistoryNext, data: HistoryOperation, id = -1) {
    this.data = data
    this.prev = prev
    this.next = next
    this.id = id
  }
}

class DoublyLinkedList {
  head: HistoryNode | null
  tail: HistoryNode | null
  current: HistoryNode | null

  constructor() {
    this.head = null
    this.tail = null
    this.current = null
  }

  destroy() {
    this.head = null
    this.tail = null
    this.current = null
  }

  /**
   * Detach: detach all nodes after current
   */
  protected detach(): HistoryNode | null {
    if (this.current) {
      this.current.next = null
      this.tail = this.current
    }

    return this.current
  }

  /*
  * Create a new node and connect it to the last
  * */
  protected append(data: HistoryOperation): HistoryNode {
    let newNode
    const {tail} = this

    if (tail) {
      newNode = new HistoryNode(tail, null, data, tail.id + 1)

      tail.next = newNode
      this.tail = newNode
    } else {
      newNode = new HistoryNode(null, null, data, 0)

      this.head = newNode
      this.tail = newNode
    }

    this.current = newNode

    return newNode
  }

  /*
  * Move current back
  * */
  protected back(): HistoryNode | false {
    if (this.current === this.head) {
      return false
    }

    this.current = this.current!.prev
    return this.current as HistoryNode
  }

  /*
 * Move current forward
 * */
  protected forward(): HistoryNode | false {
    if (this.current === this.tail) {
      return false
    }

    this.current = this.current!.next

    return this.current as HistoryNode
  }

  /**
   * 'front' : target node in front of current node
   * 'behind' : target node behind of current node
   * 'equal' : target node equal to current node
   * false : target node not belong to this linked list
   */
  protected compareToCurrentPosition(node: HistoryNode): 'front' | 'equal' | 'behind' | false {
    if (node === this.current) return 'equal'

    let localCurrent = this.head

    while (localCurrent) {
      if (this.current === localCurrent) {
        return 'behind'
      }

      if (node === localCurrent) {
        return 'front'
      }

      localCurrent = localCurrent.next
    }

    return false
  }
}

export {HistoryNode}

export default DoublyLinkedList