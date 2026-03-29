interface OptimizedDNDProps {
  ele: HTMLDivElement
  data: ElementInstance[]
}

const ITEM_HEIGHT = 25

class OptimizedDND {
  readonly ele: HTMLDivElement
  readonly data: ElementInstance[]
  private height: number

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor({ele, data, currentSeleting}: OptimizedDNDProps) {
    this.ele = ele
    this.data = data

    ele.innerHTML = ''
    this.height = ele.offsetHeight

    this.render()
  }

  onDragStart(e: DragEvent) {

  }

  createBufferedElement(indexes: Set<number>): HTMLDivElement[] {
    const arr: HTMLDivElement[] = []
    const ghostImg = document.createElement('img')

    ghostImg.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAH4AAAAsCAMAAACUu/xGAAAAq1BMVEUAAABlZVJlZVKsrJthYU+zs6Grq5ylpZazs6FlZVJfX01lZVJlZVKsrJurq5urq5xlZVKtrZ1lZVJlZVKvr52zs6GysqCoqJeqqpmzs6Grq5xlZVJgYE6zs6Gnp5mrq5yiopRjY1CRkX2rq5yzs6FlZVKRkX2goJKKineRkX2Pj3yrq5yIiHWRkX2RkX2RkX1lZVKRkX2rq5yzs6GoqJdfX02goJKHh3SHh3VrpzVsAAAAMHRSTlMAQIDHx3+Ax0Ag7qBgIA9AEFCPMLOgMO7bYKBQ24+zYNuzkY9wcAXu0oiocPFBMHYlVbK0AAAD3UlEQVRYw6SW7Y6qMBCGB0IkLfKdnB9ocFmjru7HERL03P+VnXY6bdmWjcF9f2inxjydvjMDcHy99zP693oEpTpQYjBR7W4VmzA81GoZCDn/ycrValVmYOJcKBWL1/4HnUEpupLGxOI47iQmDkfc4GEBEFyNQkClzYDKQQs3VmJBufu6G7zRWNMeUzEHUnLVWs/gy9vg4NNB4wUIPOG2h7e8NcV0HRt7QPDxfzTd4ptleB5F6ro3NtsIc7UnjMKKXyuN30ZS+PuLRMW7PN+l2vlhAZ6yqCZmcrm05stfOrwVpvEBaJWStIOpVk/gC8Rb62tjRj25Fx/fEsgqE27cluKB8GR9hDFzeX44CFbmJb9/Cn8w1ldA5tO9VD/gc8FpveTbxfi1LXWOl10Z80c0Yx7/jpyyjRtd9zuxU8ZL8FEYJjZFpg6yIfOpKsf1FJ+EUkzddKkabQ+o0zCcwMN/vZm+uLh4UmW7nptTCBVq5nUF4Y0CgBaNVip18jsPn370909cfX708/gusF3fkQfrKZHXHh45Wi8meRefvfVCfwGOZ9zx8TZ9TjWY2M6vVf4jm8e3WYrDJ1Vj4N3FHwVd6vKFCxefBMFmq7ub6UI7TMZw0SEv8ryPDVaoxPiWufhL/02zY0cm3ZH1VgxIIYa1U/nIibH/EZjjp4M/9w/x9FijbyuqdzOVH+BbWQJxHMupd4pjINhDPKVH1lslBl9g6OKb73j0wmoBHrMj691nsJ0QLn4l0/09nrIm6wv7nGdQqwjGucvPJSWjN4z8aXyBlkfK+i2gmDI/HENGjXA9uPhsUJ22p2OQFg3daaFx0/9qnWBRbOl9hHlvOw3OW/xs4Hf4rcnYzj+OeFOIHj4dtG7/2y+b3IhBGAqjUiQWQ9JI/ErDpop6gcei9z9ZIXHIhLaLSGRW8zYxIuaTZccxqsGfHDXvH4cf37Z4e3ihxVOTp5bf4E8N2u+3PWB2SP7tXsfsFl80rtOeZX/gvz6//7tmnFFzD2mkxnFgL710ToHH1eCcm/LU2aA9m027v+kBH8ipyHbACxAMWaV5I4v2ZgAzIxkUGXIqkn3xrhw4wVe8hoMmOwBmYJMiJy+lHPriNcSyrvgEgUS2h/vl1BcvSqgcZsPbbABrhgdgvhgvS6hIYsPP8MwTVR5SLZA4573xHMpCV7xGZBFmxyProfR64yNCgKh4hygjXIuvpdcbPyEayA2vsEpRHcgl6gtzr8A9ho0RlgQnBPoK4tV45gBfGQZ6KQBDqzRcjdeAqQwHUfYp+SohcQdc1/Ukm4Gw4dV6vqTkM+uQpRv8E2VPF/sPp9xSb2qlGH4AAAAASUVORK5CYII='
    ghostImg.style.position = 'absolute'
    ghostImg.style.left = 0 + 'px'
    ghostImg.style.top = 0 + 'px'
    // ghostImg.innerHTML = 'HELLLOLEELEL'
    const draggingEle = null

    this.data.forEach((element) => {
      if (indexes.has(element.layer)) {
        const ele = document.createElement("div")

        ele.draggable = true

        ele.ondragstart = (e) => {
          console.log(9)
          // ele.style.position = 'absolute'
          // ele.style.opacity = 0.5
          // console.log(e.dataTransfer)
          // draggingEle = ele
          // console.log(this.ele.getBoundingClientRect())
          // e.dataTransfer?.setDragImage(draggingEle, 0, 0)
        }

        ele.ondrag = (e) => {
          // ele.style.opacity = 0.5

          console.log(10)
          // console.log(e.dataTransfer)
          // console.log(this.ele.getBoundingClientRect())
          // e.dataTransfer?.setDragImage(ghostImg, 10, 10)
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
    const layerRange = Math.ceil(this.height / ITEM_HEIGHT) * 3
    console.log(layerRange)
    div.className = "relative w-full h-full overflow-x-auto scrollbar-custom overflow-y-auto"
    div.append(...bufferedElements)
    this.ele.append(div)
  }

  destroy() {

  }
}

export default OptimizedDND