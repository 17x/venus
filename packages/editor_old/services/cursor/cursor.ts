import {ResizeDirection} from '~/services/selection/type'
import Editor from '~/main/editor'
import {Point} from '~/type'
import {createWith} from '~/lib/lib'

export type CursorResizes = ResizeDirection
export type CursorName = CSSStyleDeclaration['cursor'] | 'rotate'
/* | 'default'
 | 'crosshair'
 | 'text'
 | 'grab'
 | 'grabbing'
 | 'rotate'
 | 'resize'
 | 'move'
 | 'not-allowed'
 | 'move-up'
 | 'move-down'*/

const CURSORS: Record<CursorName, string> = {
  // selector: `<svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 320 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M302.189 329.126H196.105l55.831 135.993c3.889 9.428-.555 19.999-9.444 23.999l-49.165 21.427c-9.165 4-19.443-.571-23.332-9.714l-53.053-129.136-86.664 89.138C18.729 472.71 0 463.554 0 447.977V18.299C0 1.899 19.921-6.096 30.277 5.443l284.412 292.542c11.472 11.179 3.007 31.141-12.5 31.141z"></path></svg>`,
  // rectangle: `<?xml version="1.0" encoding="UTF-8"?><svg id="Layer_1" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M23,1v22H1V1h22M24,0H0v24h24V0h0Z"/></svg>`,
  // grab: `<svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M18 11V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2"></path><path d="M14 10V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v2"></path><path d="M10 10.5V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2v8"></path><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"></path></svg>`,

  // grabbing: `<svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" height="200px" width="200px" xmlns="http://www.w3.org/2000/svg"><path d="M18 11.5V9a2 2 0 0 0-2-2a2 2 0 0 0-2 2v1.4"></path><path d="M14 10V8a2 2 0 0 0-2-2a2 2 0 0 0-2 2v2"></path><path d="M10 9.9V9a2 2 0 0 0-2-2a2 2 0 0 0-2 2v5"></path><path d="M6 14a2 2 0 0 0-2-2a2 2 0 0 0-2 2"></path><path d="M18 11a2 2 0 1 1 4 0v3a8 8 0 0 1-8 8h-4a8 8 0 0 1-8-8 2 2 0 1 1 4 0"></path></svg>`,

  rotate: `<?xml version="1.0" encoding="UTF-8"?><svg id="Layer_1" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18.99 18.93"><path d="M15.57,16.04c.48-.57,1-1.1,1.5-1.65.35-.38.54-.85,1.15-.82.72.04,1.01.78.55,1.34-1.07,1.3-2.37,2.5-3.44,3.82-.69.48-1.09,0-1.56-.48-.91-.95-1.92-2.07-2.78-3.07-.3-.35-.58-.72-.33-1.19.39-.73,1.08-.39,1.53.07.52.55,1.01,1.17,1.51,1.74.07.08.17.19.26.22,0-.81.02-1.64-.08-2.44-.51-4.07-3.48-7.36-7.47-8.32-1.12-.27-2.22-.25-3.37-.24.15.2.34.39.52.56.51.47,1.2.95,1.66,1.44.69.73-.3,1.84-1.1,1.19-.91-.74-1.83-1.68-2.7-2.48-.38-.35-1.06-.81-1.29-1.26-.21-.4-.1-.54.14-.89C1.59,2.57,2.79,1.18,4.11.18c.76-.58,1.72.38,1.13,1.14l-2.3,2.09c.76.04,1.52-.01,2.28.06,5.2.47,9.42,4.43,10.22,9.59.15.99.1,1.98.14,2.98Z"/></svg>`,
  crosshair: `<svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M11 2h2v7h-2zm0 13h2v7h-2zm4-4h7v2h-7zM2 11h7v2H2z"></path></svg>`,
  pencil: `<svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg"><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"></path><path d="m15 5 4 4"></path></svg>`,
  pencilAdd: `<svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round"  xmlns="http://www.w3.org/2000/svg"><path d="M4 20h4l10.5 -10.5a2.828 2.828 0 1 0 -4 -4l-10.5 10.5v4"></path><path d="M13.5 6.5l4 4"></path><path d="M16 19h6"></path><path d="M19 16v6"></path></svg>`,
  pencilDelete: `<svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg"><path d="M4 20h4l10.5 -10.5a2.828 2.828 0 1 0 -4 -4l-10.5 10.5v4"></path><path d="M13.5 6.5l4 4"></path><path d="M16 19h6"></path></svg>`,
}
const SVG_SIZE = 16

class Cursor {
  domRef: HTMLElement
  editor: Editor
  EC: AbortController
  _cursorForRecover = null
  private locked: boolean = false

  constructor(editor: Editor) {
    this.EC = new AbortController()
    this.editor = editor
    this.domRef = createWith('div', /*'cursor', */ {
      pointerEvents: 'none',
      width: SVG_SIZE + 'px',
      height: SVG_SIZE + 'px',
      position: 'fixed',
      top: '0',
      left: '0',
      zIndex: '20',
    })
    const {signal} = this.EC
    editor.container.appendChild(this.domRef)
    editor.container.addEventListener('mouseenter', () => { this.show() }, {signal})
    editor.container.addEventListener('mouseout', () => { this.hide() }, {signal})
    editor.container.addEventListener('mousemove', e => { this.move(e) }, {signal})
  }

  set(name: CursorName) {
    if (this.locked) {
      // console.info(`Cursor has been locked.`)
      return
    }

    this.domRef.setAttribute('date-current-cursor', name)

    if ([
      'rotate',
      'crosshair',
      'pencil',
    ].includes(name)) {
      this.domRef.style.display = 'block'
      this.domRef.style.rotate = `0deg`
      this.domRef.style.stroke = '#808080'
      this.domRef.style.fill = '#fff'
      this.domRef.innerHTML = CURSORS[name]
      this.editor.container.style.cursor = 'none'
    } else {
      this.domRef.style.display = 'none'
      this.editor.container.style.cursor = name
    }
  }

  // Lock method
  // Certain circumstance need to set cursor to immutable
  lock() {
    this.locked = true
  }

  unlock() {
    this.locked = false
  }

  move(p: Point) {
    // console.log('set cursor', p)
    // this.domRef.style.left = `${p.x}px`
    // this.domRef.style.top = `${p.y}px`
    this.domRef.style.translate = `${p.x - SVG_SIZE / 2}px ${p.y - SVG_SIZE / 2}px`
  }

  rotate(rotation: number) {
    if (this.locked) {
      // console.info(`Cursor has been locked.`)
      return
    }
    // const size = 24
    // const offset = size / 2
    // const {x, y} = position as Point

    // for svg icon direction
    rotation += 45

    // cursor.style.display = 'block'
    this.domRef.style.transformOrigin = 'center center'
    this.domRef.style.rotate = `${rotation}deg`
  }

  show() {
    // this.domRef.style.display = 'block'
    this.domRef.style.visibility = 'visible'
  }

  hide() {
    this.domRef.style.visibility = 'hidden'
    // this.domRef.style.display = 'none'
  }

  destroy() {
    this.EC.abort()
    this.EC = null!
    this.domRef.remove()
    this.domRef = null!
  }
}

export default Cursor
