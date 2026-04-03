/*
import Editor from '../../main/editor'
import {ResizeDirection} from '../selection/type'
import {Point, Rect, UID} from '~/type'

export interface ViewportDomRefType {
  wrapper: HTMLDivElement
  mainCanvas: HTMLCanvasElement
  selectionBox: HTMLDivElement
  selectionCanvas: HTMLCanvasElement
  // scrollBarX: HTMLDivElement
  // scrollBarY: HTMLDivElement
  // cursor: HTMLDivElement
}

const createWith = <T extends keyof HTMLElementTagNameMap>(tagName: T, role: string, id: string): HTMLElementTagNameMap[T] => {
  const dom = document.createElement(tagName)
  dom.setAttribute(role, '')
  dom.id = role + '-' + id

  return dom
}

export function initViewportDom(id: UID): ViewportDomRefType {
  const boxColor = '#1FB3FF'
  const boxBgColor = 'rgba(31,180,255,0.1)'
  const wrapper = createWith('div', 'editor-wrapper', id)
  const mainCanvas = createWith('canvas', 'editor-main-canvas', id)
  const selectionCanvas = createWith('canvas', 'editor-selection-canvas', id)
  const scrollBarX = createWith('div', 'scroll-bar-x', id)
  const scrollBarY = createWith('div', 'scroll-bar-x', id)
  const selectionBox = createWith('div', 'editor-selection-box', id)
  const cursor = createWith('div', 'editor-cursor', id)
  const cssText = createWith('style', 'editor-style', id)

  cssText.textContent = `
    #${mainCanvas.id} {
      background-color: #f0f0f0;
      position: absolute;
      left: 0;
      top: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
    }

    #${selectionCanvas.id} {
      position: absolute;
      left: 0;
      top: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
    }

    #${wrapper.id} {
      user-select: none;
      position: relative;
      scrollbar-width: thin;
      scrollbar-color: #787878 transparent;
      overflow: hidden;
      width: 100%;
      height: 100%;
    }

    #${selectionBox.id} {
      display: none;
      pointer-events: none;
      position: absolute;
      border: 1px solid ${boxColor};
      background-color: ${boxBgColor};
    }
    
    #${scrollBarX.id},
    #${scrollBarY.id}{
      background-color: #787878;
      user-select:none;
      translate:none;
    }
    
    #${cursor.id}{
      display: none;
      pointer-events: none;
      width:20px;
      height:20px;
    }
    
    #${cursor.id} svg{
      width:18px;
      height:18px;
    }
  `

  wrapper.append(mainCanvas, selectionCanvas, scrollBarX, scrollBarY, selectionBox, cursor, cssText)

  return {
    wrapper,
    selectionBox,
    selectionCanvas,
    mainCanvas,
    // scrollBarX,
    // scrollBarY,
    cursor,
  }
}

export const updateScrollBars = (scrollBarX: HTMLDivElement, scrollBarY: HTMLDivElement) => {
  scrollBarX.style.width = '50px'
  scrollBarX.style.height = '6px'
  scrollBarX.style.position = 'absolute'
  scrollBarX.style.bottom = '0'
  scrollBarX.style.left = '0'

  scrollBarY.style.width = '6px'
  scrollBarY.style.height = '50px'
  scrollBarY.style.position = 'absolute'
  scrollBarY.style.right = '0'
  scrollBarY.style.top = '0'
}

export const updateSelectionBox = (selectionBox: HTMLDivElement, {x, y, height, width}: Rect, show = true) => {
  selectionBox.style.transform = `translate(${x}px, ${y}px)`
  selectionBox.style.width = width + 'px'
  selectionBox.style.height = height + 'px'
  selectionBox.style.display = show ? 'block' : 'none'
}

export function updateCursor(this: Editor, type: 'rotate' | 'resize' | 'default' | 'grabbing', position?: Point | ResizeDirection, angle?: number) {
  const {wrapper, cursor} = this.viewport

  if (type === 'default') {
    // debugger
    wrapper.style.cursor = 'default'
    cursor.style.display = 'none'
    return
  }

  if (type === 'resize') {
    wrapper.style.cursor = `${position as ResizeDirection}-resize`
    cursor.style.display = 'none'
    return
  }

  if (type === 'grabbing') {
    wrapper.style.cursor = `grabbing`
    cursor.style.display = 'none'
    return
  }

  wrapper.style.cursor = 'none'

  if (type === 'rotate') {
    const size = 24
    const offset = size / 2
    const {x, y} = position as Point
    cursor.innerHTML = `
       <?xml version="1.0" encoding="UTF-8"?>
<svg id="Layer_1" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18.99 18.93">
  <path d="M15.57,16.04c.48-.57,1-1.1,1.5-1.65.35-.38.54-.85,1.15-.82.72.04,1.01.78.55,1.34-1.07,1.3-2.37,2.5-3.44,3.82-.69.48-1.09,0-1.56-.48-.91-.95-1.92-2.07-2.78-3.07-.3-.35-.58-.72-.33-1.19.39-.73,1.08-.39,1.53.07.52.55,1.01,1.17,1.51,1.74.07.08.17.19.26.22,0-.81.02-1.64-.08-2.44-.51-4.07-3.48-7.36-7.47-8.32-1.12-.27-2.22-.25-3.37-.24.15.2.34.39.52.56.51.47,1.2.95,1.66,1.44.69.73-.3,1.84-1.1,1.19-.91-.74-1.83-1.68-2.7-2.48-.38-.35-1.06-.81-1.29-1.26-.21-.4-.1-.54.14-.89C1.59,2.57,2.79,1.18,4.11.18c.76-.58,1.72.38,1.13,1.14l-2.3,2.09c.76.04,1.52-.01,2.28.06,5.2.47,9.42,4.43,10.22,9.59.15.99.1,1.98.14,2.98Z"/>
</svg>
  `

    // for svg icon direction
    angle! += 45

    cursor.style.display = 'block'
    cursor.style.transformOrigin = 'center center'
    cursor.style.transform = `translate(${x - offset}px, ${y - offset}px) rotate(${angle}deg)`
  }
}*/
