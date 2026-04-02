/**
 * Wheel deltaX deltaY
 * 1. touchpad
 *  panning
 *    x: UInt
 *    y: UInt
 *  zoom
 *    x equal to -0
 *    y: Float
 * 2. mouse scroll
 *    2.1 vertical scroll
 *      x equal to -0
 *      y: Float, abs(value) > 4, and increasing
 *    2.2 horizontal scroll
 *      x: UInt, increasing and abs(v) > 40
 *      y equal to -0
 */

export interface ZoomOptions {
  dom: HTMLElement
  mouse?: true,
  touchpad?: true,
  mouseScrollModifier?: 'alt' | 'ctrl'
  onZoom?: (zoomIn: boolean, event: WheelEvent) => void
  onScroll?: (offsetX: number, offsetY: number, event: WheelEvent) => void
}

class Zoom {
  protected dom: HTMLElement
  protected eventsController: AbortController
  protected onZoom: ZoomOptions['onZoom']
  protected onScroll: ZoomOptions['onScroll']
  protected mouseScrollModifier: 'alt' | 'ctrl' | 'shift' | 'meta'
  _timer: number | undefined
  zoomLock = false
  DELAY = 200
  // ACTION_THRESHOLD = 3
  // EVENT_BUFFER: WheelEvent[] = []
  // zoomLock for touchpad zoom
  // trackpad = false

  constructor({
                dom,
                mouseScrollModifier = 'alt',
                onZoom,
                onScroll,
              }: ZoomOptions) {
    this.dom = dom
    this.eventsController = new AbortController()
    this.mouseScrollModifier = mouseScrollModifier
    this.onZoom = onZoom
    this.onScroll = onScroll

    this.dom.addEventListener('wheel', this.handleWheel.bind(this), {
      signal: this.eventsController.signal,
      passive: false,
    })
  }

  handleWheel(event: WheelEvent) {
    // console.log(event)
    const {/*EVENT_BUFFER,*/ mouseScrollModifier: modifier} = this
    const {deltaX, deltaY, altKey, ctrlKey, shiftKey} = event
    let translateX = 0
    let translateY = 0
    let zoomIn = false
    let scrolling = false
    let _zooming = false
    // let touchpad = false
    // let mouse = false
    // console.log('event ',event)
    // console.log(deltaX, deltaY)
    if (event.cancelable) {
      event.preventDefault()
    }
    event.stopPropagation()

    if (modifier) {
      _zooming = (modifier === 'alt' && altKey) ||
        (modifier === 'ctrl' && ctrlKey) ||
        (modifier === 'shift' && shiftKey)
    }

    if (this.zoomLock) {
      clearTimeout(this._timer)
      // EVENT_BUFFER.length = 0
    } else {
      // EVENT_BUFFER.push(event)
    }

    if (Zoom.isNegativeZero(deltaX) && Zoom.isFloat(deltaY) && Math.abs(deltaY) <= 4) {
      this.zoomLock = true
    }

    /*    if (EVENT_BUFFER.length >= this.ACTION_THRESHOLD) {
          const allXAreMinusZero = EVENT_BUFFER.every((e) => Zoom.isNegativeZero(e.deltaX))
          const allYAreFloat = EVENT_BUFFER.every((e) => Zoom.isFloat(e.deltaY))
          const absBiggerThan4 = EVENT_BUFFER.every((e) => Math.abs(e.deltaY) > 4)

          if (allXAreMinusZero && allYAreFloat && !absBiggerThan4) {
            this.zoomLock = true
            touchpad = true
          }
        }*/

    if (this.zoomLock) {
      zoomIn = deltaY <= 0
      _zooming = true
      // touchpad = true
    } else if (Math.abs(deltaX) >= 40 && Zoom.isNegativeZero(deltaY)) {
      // Mouse horizontal scrolling
      // mouse = true
      if (_zooming) {
        zoomIn = deltaX < 0
      } else {
        scrolling = true
        translateX = -deltaX
      }
    } else if (Zoom.isNegativeZero(deltaX) && Zoom.isFloat(deltaY) && Math.abs(deltaY) > 4) {
      // Vertical scrolling
      // mouse = true
      if (_zooming) {
        zoomIn = deltaY < 0
      } else {
        scrolling = true
        translateY = -deltaY
      }
    } else if (Zoom.isUInt(deltaX) && Zoom.isUInt(deltaY)) {
      if (_zooming) {
        const max = Math.abs(deltaX) > Math.abs(deltaY) ? deltaX : deltaY

        zoomIn = max < 0
      } else {
        scrolling = true
        translateX = -deltaX
        translateY = -deltaY
      }
    }

    if (_zooming) {
      this.onZoom && this.onZoom(zoomIn, event)
    } else if (scrolling) {
      this.onScroll && this.onScroll(translateX, translateY, event)
    }

    this._timer = window.setTimeout(() => {
      this.zoomLock = false
      this._timer = null!
    }, this.DELAY)
  }

  static isUInt(v: number) { return !Zoom.isFloat(v) }

  static isNegativeZero(n: number) {return n === 0 && (1 / n) === -Infinity}

  static isFloat(v: number) { return Math.abs(v) % 1 !== 0 }

  destroy() {
    clearTimeout(this._timer)
    this._timer = null!
    this.dom = null!
    this.eventsController.abort()
    this.eventsController = null!
    this.onZoom = null!
    this.onScroll = null!
    this.mouseScrollModifier = null!
  }
}

export default Zoom
