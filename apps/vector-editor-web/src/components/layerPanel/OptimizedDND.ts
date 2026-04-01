import type {ElementInstance} from '@lite-u/editor/types'

interface OptimizedDNDProps {
  ele: HTMLDivElement
  data: ElementInstance[]
}

const ITEM_HEIGHT = 25

class OptimizedDND {
  readonly ele: HTMLDivElement
  readonly data: ElementInstance[]
  private height: number

  constructor({ele, data}: OptimizedDNDProps) {
    this.ele = ele
    this.data = data

    ele.innerHTML = ''
    this.height = ele.offsetHeight

    this.render()
  }

  createBufferedElement(indexes: Set<number>): HTMLDivElement[] {
    const arr: HTMLDivElement[] = []

    this.data.forEach((element) => {
      if (indexes.has(element.layer)) {
        const ele = document.createElement("div")

        ele.draggable = true

        ele.ondragstart = () => {
        }

        ele.ondrag = () => {
          ele.style.top = 10 + 'px'
          ele.style.left = 10 + 'px'
        }
        ele.className = 'relative cursor-grab hover:bg-gray-200'
        ele.innerHTML = element.layer + element.type
        arr.push(ele)
      }
    })

    return arr
  }

  render() {
    this.ele.innerHTML = ''
    const div = document.createElement("div")
    const bufferedElements = this.createBufferedElement(new Set([1, 2, 3, 4, 5, 6, 7, 8, 9]))
    Math.ceil(this.height / ITEM_HEIGHT)
    div.className = "relative w-full h-full overflow-x-auto scrollbar-custom overflow-y-auto"
    div.append(...bufferedElements)
    this.ele.append(div)
  }

  destroy() {

  }
}

export default OptimizedDND
