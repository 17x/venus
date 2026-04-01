import resetCanvas from '~/services/world/resetCanvas'
import {HistoryChangeItem, SelectionModifyData} from '~/services/actions/type'
import Editor from './editor'
import {redo} from '~/services/history/redo'
import {undo} from '~/services/history/undo'
import {pick} from '~/services/history/pick'
import {HistoryOperation} from '~/services/history/type'
import {fitRectToViewport} from '~/services/world/helper'
import {ToolName} from '~/type'
import {ElementMap, ElementProps} from '~/elements/type'
import snapTool from '~/services/tool/snap/snap'
import {getBoundingRectFromBoundingRects} from '~/services/tool/resize/helper'
import TypeCheck from '~/core/typeCheck'
import ElementRectangle, {RectangleProps} from '~/elements/rectangle/rectangle'
import nid from '~/core/nid'
import {DEFAULT_STROKE} from '~/elements/defaultProps'

export function initEvents(this: Editor) {
  const {action} = this
  const dispatch = action.dispatch.bind(action)
  const on = action.on.bind(action)
  // const {on, dispatch} = this.action

  // container.appendChild(viewport.wrapper)

  // this.toolMap.set('text', selector)
  // this.toolMap.set('ellipse', selector)

  on('world-resized', () => {
    this.reCalcViewport()
    this.mainHost.setSize(this.viewportRect.width, this.viewportRect.height)
    this.overlayHost.setSize(this.viewportRect.width, this.viewportRect.height)

    if (!this.initialized) {
      this.initialized = true
      dispatch('world-fit-content')
      // dispatch('element-updated')
      this.events.onInitialized?.()
      this.events.onHistoryUpdated?.(this.history)
      this.events.onElementsUpdated?.(this.mainHost.all)
    } else {
      dispatch('world-transformed')
    }
  })

  on('world-zoom', (arg) => {
    if (arg === 'fit') {
      dispatch('world-fit-content')
      return
    }

    const {scale} = this.world
    let result = null
    let newScale = 1
    let point = arg.physicalPoint

    if (arg.zoomTo) {
      newScale = arg.zoomFactor
    } else if (arg.zoomBy) {
      newScale = scale + arg.zoomFactor
    }

    result = this.world.zoom(newScale, point)

    this.world.scale = newScale
    this.world.offset.x = result.x!
    this.world.offset.y = result.y!
    this.events.onZoomed?.(newScale)
    // dispatch('reset-overlay')
    dispatch('world-transformed')
  })

  on('world-fit-content', () => {
    const {width, height} = this.config.page
    const {viewportRect} = this
    const pageRect = {
      x: 0,
      y: 0,
      width,
      height,
    }
    const {scale, offsetX, offsetY} = fitRectToViewport(pageRect, viewportRect, 0.02)

    this.world.scale = scale
    this.world.offset.x = offsetX
    this.world.offset.y = offsetY
    this.events.onZoomed?.(scale)
    dispatch('reset-overlay')
    dispatch('world-transformed')
  })

  on('world-shift', (data) => {
    const {x, y} = data
    const {dpr} = this.world

    this.world.offset.x += x * dpr
    this.world.offset.y += y * dpr
    dispatch('world-transformed')
  })

  on('world-transformed', () => {
    this.world.updateWorldRect()
    this.mainHost.updateVisible()
    dispatch('rerender-main-host')
    dispatch('reset-overlay')
  })

  on('reset-overlay', () => {
    this.overlayHost.reset()
    this.regenerateOverlayElements()
    this.overlayHost.updateVisible()
    dispatch('rerender-overlay')
  })

  on('selection-all', () => {
    this.selection.selectAll()
    dispatch('selection-updated')
  })

  on('selection-clear', () => {
    this.selection.clear()
    dispatch('selection-updated')
  })

  on('selection-modify', (data) => {
    const {mode, idSet} = data as SelectionModifyData

    this.selection.modify(idSet, mode)
    dispatch('selection-updated')
  })

  on('element-updated', (historyData: HistoryOperation) => {
    // console.log(this.mainHost.all)
    // this.overlayHost.reset()
    this.mainHost.updateVisible()
    // this.overlayHost.updateVisible()
    // this.regenerateOverlayElements()
    dispatch('rerender-main-host')
    dispatch('reset-overlay')

    if (historyData) {
      this.history.add(historyData)
      this.events.onHistoryUpdated?.(this.history)
    }

    this.events.onElementsUpdated?.(this.mainHost.all)
  })

  on('selection-updated', () => {
    this.interaction._hoveredElement = null!
    // this.overlayHost.reset()
    // this.regenerateOverlayElements()
    dispatch('reset-overlay')
    // console.log(this.overlayHost.visibleElements)
    // getAnchorsByBoundingRect()
    // console.log(this.selection.pickIfUnique)
    this.events.onSelectionUpdated?.(this.selection.values, this.selection.pickIfUnique)

    // dispatch('visible-selection-updated')
  })

  /*  on('world-mouse-down', () => {
      if (this.toolManager._currentTool) {
        this.toolManager._currentTool?.mouseDown.call(this)
      } else {
        selecting.mouseDown.call(this)
      }
    })*/

  on('world-mouse-move', () => {
    this.events.onWorldMouseMove?.(this.interaction.mouseWorldCurrent)
  })

  on('world-mouse-up', () => {
    // console.log('world-mouse-up')
    // this.action.dispatch('element-move', {delta: {x: 0, y: 0}})
    // this.interaction._draggingElements = []
    /*
        if (this.toolManager._currentTool) {
          this.toolManager._currentTool?.mouseUp.call(this)
        } else {
          selecting.mouseUp.call(this)
        }*/

  })

  on('drop-image', ({position, assets}) => {
    // console.log(data)
    const ox = position.x - this.rect!.x
    const oy = position.y - this.rect!.y
    const worldPoint = this.world.getWorldPointByViewportPoint(ox, oy)
    const elementPropsList = assets.map(asset => {
      const {width, height} = asset.imageRef!

      this.assetsManager.add(asset)

      return {
        type: 'image',
        enableLine: false,
        src: asset.id,
        x: worldPoint.x,
        y: worldPoint.y,
        width,
        height,
      }
    })

    dispatch('element-add', elementPropsList)
  })

  on('element-delete', () => {
    const savedSelected = this.selection.values
    const backup = this.mainHost.batchDelete(savedSelected)

    this.selection.clear()

    dispatch('element-updated', {
      type: 'history-delete',
      payload: {
        elements: backup,
        selectedElements: savedSelected,
      },
    })
  })

  on('element-copy', () => {
    this.clipboard.copiedItems = this.mainHost.batchCopy(this.selection.values, false)
    // this.clipboard.updateCopiedItemsDelta()
    this.events.onElementCopied?.(this.clipboard.copiedItems)
  })

  on('element-paste', (position?) => {
    if (this.clipboard.copiedItems.length === 0) return

    let newElements: ElementMap = this.mainHost.batchCreate(this.clipboard.copiedItems)

    if (position) {
      const {x, y} = this.world.getWorldPointByViewportPoint(position.x, position.y)
      const rect = [...newElements.values()].map(ele => ele.getBoundingRect())
      const {cx, cy} = getBoundingRectFromBoundingRects(rect)
      const offsetX = x - cx
      const offsetY = y - cy

      ;[...newElements.values()].forEach(ele => {
        ele.translate(offsetX, offsetY, false)
        ele.updateOriginal()
      })

      console.log(cx, cy)
      console.log(newElements)
      // get group center and calculate target to center distance
      /*
       const {x, y} = this.world.getWorldPointByViewportPoint(position.x, position.y)
       const topLeftItem = this.clipboard.copiedItems.reduce((prev, current) => {
         return (current.x < prev.x && current.y < prev.y) ? current : prev
       })
       const offsetX = x - topLeftItem.x
       const offsetY = y - topLeftItem.y

       const offsetItems = this.clipboard.copiedItems.map((item) => {
         return {
           ...item,
           x: item.x + offsetX,
           y: item.y + offsetY,
         }
       })

       newElements = this.elementManager.batchCreate(offsetItems)*/
    } else {
      const {copyDeltaX, copyDeltaY} = this.interaction

      newElements = this.mainHost.batchCreate(this.clipboard.copiedItems)
      newElements.forEach((el) => {
        el.translate(copyDeltaX, copyDeltaY, false)
        el.updateOriginal()
      })

      this.interaction.copyDeltaX += 10
      this.interaction.copyDeltaY += 10
    }

    const savedSelected = new Set(newElements.keys())

    this.mainHost.batchAdd(newElements)
    this.selection.replace(savedSelected)
    // this.clipboard.updateCopiedItemsDelta()

    dispatch('element-updated', {
      type: 'history-paste',
      payload: {
        elements: [...newElements.values()].map((mod) => mod.toMinimalJSON()),
        selectedElements: savedSelected,
      },
    })
  })

  on('element-duplicate', () => {
    if (this.selection.size === 0) return

    const temp: ElementProps[] = this.mainHost.batchCopy(this.selection.values, false)
    const {copyDeltaX, copyDeltaY} = this.interaction

    const newElements = this.mainHost.batchCreate(temp)
    const savedSelected = new Set(newElements.keys())
    console.log(newElements)
    newElements.forEach((el) => {
      el.translate(copyDeltaX, copyDeltaY)
      el.updateOriginal()
    })

    this.mainHost.batchAdd(newElements)
    this.selection.replace(savedSelected)

    const elementProps = [...newElements.values()].map((mod) => mod.toMinimalJSON())

    dispatch('element-updated', {
      type: 'history-duplicate',
      payload: {
        elements: elementProps,
        selectedElements: savedSelected,
      },
    })
  })

  on('element-layer', (data) => {
    console.log(data)
    /* const s = this.selection.getSelected

     if (s.size === 0) return
     const changes: ElementModifyData[] = []

     s.forEach((id) => {
       const element = this.elementManager.all.get(id)
       if (element) {
         changes.push({
           id,
           props: {
             x: element.x + delta.x,
             y: element.y + delta.y,
           },
         })
       }
     })*/

    // this.batchMove(s, delta)
    // dispatch('element-modify', changes)
  })

  on('element-move-up', () => dispatch('element-move', {delta: {x: 0, y: -1}}))
  on('element-move-right', () => dispatch('element-move', {delta: {x: 1, y: 0}}))
  on('element-move-down', () => dispatch('element-move', {delta: {x: 0, y: 1}}))
  on('element-move-left', () => dispatch('element-move', {delta: {x: -1, y: 0}}))

  on('element-move', ({delta = {x: 0, y: 0}}) => {
    const s = this.selection.values

    if (s.size === 0) return
    const changes: HistoryChangeItem[] = []

    s.forEach((id) => {
      const ele = this.mainHost.all.get(id)
      if (ele) {
        const change = ele.translate(delta.x, delta.y, true)

        ele.updateOriginal()
        changes.push(change)
      }
    })

    // this.batchMove(s, delta)
    dispatch('element-modified', changes)
  })

  on('element-moving', ({delta = {x: 0, y: 0}}) => {
    this.selection.values.forEach((id) => {
      const ele = this.mainHost.all.get(id)

      if (ele) {
        ele.translate(delta.x, delta.y, false)
        ele.updatePath2D()
      }
    })

    dispatch('element-updated')
  })

  on('element-add', (data) => {
    if (!data || data.length === 0) return
    const newElements = this.mainHost.batchCreate(data)

    this.mainHost.batchAdd(newElements, () => {
      /* newElements.forEach((ele) => {
         const {id} = ele
         ele.on('mouseenter', () => {
           ctx.save()
           ctx.lineWidth = 1 / this.world.scale * this.world.dpr
           ctx.strokeStyle = '#5491f8'
           ctx.stroke(ele.path2D)
           ctx.restore()
         })

         ele.on('mouseleave', () => {
           dispatch('render-overlay')
         })

         ele.on('mousedown', (e) => {
           console.log(e)
           if (!this.selection.has(id)) {
             action.dispatch('selection-modify', {mode: 'replace', idSet: new Set([id])})
           }
           interaction._draggingElements = this.elementManager.getElementsByIdSet(this.selection.values)
           this.toolManager._currentTool = dragging
         })
       })*/

      dispatch('rerender-main-host')
    })
    const savedSelected = new Set(newElements.keys())

    this.selection.replace(savedSelected)

    const elementProps = [...newElements.values()].map((mod) => mod.toMinimalJSON())

    dispatch('element-updated', {
      type: 'history-add',
      payload: {
        elements: elementProps,
        selectedElements: savedSelected,
      },
    })
  })

  /*  on('element-modifying', ({type, data}) => {
      const s = this.selection.values

      if (s.size === 0) return

      if (type === 'move') {
        this.elementManager.batchMove(s, data as Point)
      } else if (type === 'resize' || type === 'rotate') {
        this.elementManager.batchModify(s, data)
      }

      dispatch('element-updated')
    })*/

  on('element-modify', (data) => {
    // console.log(data)
    data.map(({id, props}) => {
      const ele = this.mainHost.getElementById(id)
      if (ele && props) {
        console.log(props)

        Object.keys(props).forEach(propName => {
          if (TypeCheck(props[propName]) === 'object') {
            const propObj = props[propName]

            Object.assign(ele[propName], propObj)
          } else {
            Object.assign(ele, props)
          }
        })

        ele.updateOriginal()
        // ele.updatePath2D()
        console.log(ele)
      }
    })
    // console.log(data)
    // this.events.onHistoryUpdated?.(this.history)
    // this.events.onElementsUpdated?.(this.elementManager.all)

    dispatch('element-updated')
  })

  on('element-modified', (changes) => {
    this.history.add({
      type: 'history-modify',
      payload: {
        selectedElements: this.selection.values,
        changes,
      },
    })
    // console.log(changes)
    this.events.onHistoryUpdated?.(this.history)
    this.events.onElementsUpdated?.(this.mainHost.all)

    dispatch('element-updated')
  })

  on('element-replace', (changes) => {
    if (changes.length === 0) return
    this.mainHost.replace(changes)

    changes.forEach((change) => {
      change.to.updateOriginal()
    })
    dispatch('element-updated')
  })

  on('rerender-main-host', () => {
    const {scale, dpr} = this.world
    const {width, height} = this.config.page
    const frameStroke: RectangleProps = {
      id: nid() + '-frame',
      cx: width / 2,
      cy: height / 2,
      width,
      height,
      // borderRadius: [0, 10, 0, 10],
      stroke: {
        ...DEFAULT_STROKE,
        weight: 1 / scale * dpr,
      },
      layer: -1,
      opacity: 100,
    }
    /*    const frameFill = {
          ...frameStroke,
          fill: {
            enabled: true,
            color: '#fff',
          },
        }*/

    resetCanvas(
      this.mainHost.ctx,
      this.world.scale,
      this.world.offset,
      this.world.dpr,
    )

    this.mainHost.render()

    new ElementRectangle(frameStroke).render(this.mainHost.ctx)
  })

  /*  on('refresh-overlay', () => {
      this.regenerateOverlayElements()
      dispatch('rerender-overlay')
    })*/

  on('rerender-overlay', () => {
    if (this.overlayHost._locked) return
    // console.log('rerender-overlay')
    resetCanvas(
      this.overlayHost.ctx,
      this.world.scale,
      this.world.offset,
      this.world.dpr,
    )

    this.overlayHost.render()
  })

  on('clear-creation', () => {
    resetCanvas(
      this.world.creationCanvasContext,
      this.world.scale,
      this.world.offset,
      this.world.dpr,
    )
    // this.world.renderOverlay()
  })

  on('history-undo', () => {
    undo.call(this)
    dispatch('element-updated')
    this.events.onHistoryUpdated?.(this.history)
  })

  on('history-redo', () => {
    redo.call(this)
    dispatch('element-updated')
    this.events.onHistoryUpdated?.(this.history)
  })

  on('history-pick', (data) => {
    pick.call(this, data)
    dispatch('element-updated')
    this.events.onHistoryUpdated?.(this.history)
  })

  on('context-menu', ({position}) => {
    this.events.onContextMenu?.(position)
  })

  on('switch-tool', (toolName: ToolName) => {
    let noSnap = toolName === 'zoomIn' || toolName === 'zoomOut' || toolName === 'panning'

    if (noSnap) {
      this.interaction._snappedPoint = null
      this.interaction._hoveredElement = null
    } else {
      snapTool.call(this.toolManager)
    }

    this.toolManager.set(toolName)
    action.dispatch('rerender-overlay')

    // this.toolManager.currentToolName = toolName
    this.events.onSwitchTool?.(toolName)
    console.log(toolName)
  })

  on('escape-action', () => {

    if (this.toolManager.tool && this.toolManager.currentToolName !== 'selector') {
      // this.toolManager.tool.finish()
    } else {
      dispatch('selection-clear')
    }
  })
}
