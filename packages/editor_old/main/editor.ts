import History from '~/services/history/history'
import Action from '~/services/actions/actions'
import {generateBoundingRectFromTwoPoints, throttle} from '~/core/utils'
import {initEvents} from './events'
import AssetsManager from '~/services/assets/AssetsManager'
import ElementImage from '~/elements/image/image'
import {ElementProps} from '~/elements/type'
import nid from '~/core/nid'
import ToolManager from '~/services/tool/toolManager'
import CanvasHost from '~/services/element/CanvasHost'
import SelectionManager from '~/services/selection/SelectionManager'
import Cursor from '~/services/cursor/cursor'
import World from '~/services/world/World'
import ClipboardManager from '~/services/clipboard/Clipboard'
import InteractionState from '~/services/interaction/InteractionState'
// import VisibleManager from '~/services/visible/VisibleManager'
// import EventManager from '~/services/events/events'
import {VisionEditorAssetType} from '~/services/assets/asssetsManager'
import {BoundingRect} from '~/type'
import {EditorConfig, EventHandlers} from './type'
import {
  generateElementsDetectArea,
  generateTransformHandles,
  generateSelectedBoundingElement,
  generateAnchorAndPath,
} from '~/main/helper'

class Editor {
  id = nid()
  readonly container: HTMLDivElement
  config: EditorConfig
  events: EventHandlers = {}
  resizeObserver: ResizeObserver

  // eventManager: EventManager
  world: World
  action: Action
  // visible: VisibleManager
  interaction: InteractionState
  clipboard: ClipboardManager
  cursor: Cursor
  history: History
  toolManager: ToolManager
  mainHost: CanvasHost
  overlayHost: CanvasHost
  selection: SelectionManager
  assetsManager: AssetsManager
  rect: BoundingRect
  viewportRect: BoundingRect
  initialized: boolean = false
  // private readonly snapPoints: SnapPointData[] = []
  // private readonly visibleElementMap: ElementMap

  constructor({
                container,
                elements,
                assets = [],
                events = {},
                config,
              }: {
    container: HTMLDivElement
    assets: VisionEditorAssetType[]
    elements: ElementProps[]
    events?: EventHandlers;
    config: EditorConfig;
  }) {
    this.config = config
    this.events = events
    this.container = container
    // services
    this.action = new Action()
    // this.eventManager = new EventManager(this)
    // this.visible = new VisibleManager(this)
    this.clipboard = new ClipboardManager()
    this.interaction = new InteractionState(this)
    this.world = new World(this)
    this.cursor = new Cursor(this)
    this.history = new History(this)
    this.selection = new SelectionManager(this)
    this.assetsManager = new AssetsManager(this, assets)
    this.mainHost = new CanvasHost(this, 'main')
    this.overlayHost = new CanvasHost(this, 'overlay')
    this.resizeObserver = new ResizeObserver(throttle(() => { this.action.dispatch('world-resized') }, 200))
    this.toolManager = new ToolManager(this)

    initEvents.call(this)
    const p1 = {x: 0, y: 0}
    const p2 = {x: 0, y: 0}
    this.rect = generateBoundingRectFromTwoPoints(p1, p2)
    this.viewportRect = generateBoundingRectFromTwoPoints(p1, p2)
    this.resizeObserver.observe(container)
    // this.toolManager.set('rectangle')
    // this.toolManager.set('selector')
    this.action.dispatch('element-add', elements)
  }

  /*  public get getElementsInsideOfFrame(): ElementInstance[] {
      const arr = []
      this.elementManager.all.forEach((element) => {

      })
    }*/

  public execute(type: VisionEventType, data: unknown = null) {
    // console.log('Editor', type)
    // @ts-ignore
    this.action.execute(type, data)
  }

  public export(): EditorExportFileType {
    const {scale, offset} = this.world
    const assetSet = new Set<string>()
    const result: EditorExportFileType = {
      elements: [],
      config: {
        scale,
        offset,
      },
      assets: [],
    }

    this.mainHost.all.forEach((element) => {
      if (element.type === 'image') {
        const {asset} = element as ElementImage
        if (!asset) return

        const r = this.assetsManager.getAssetsObj(asset)

        if (r) {
          if (!assetSet.has(asset)) {
            assetSet.add(asset)
            result.assets.push(r)
          }
          console.log(result.assets)
        }
      }

      result.elements.push(element.toMinimalJSON())
    })

    return result
  }

  reCalcViewport() {
    const {dpr} = this.world
    const rect = this.container.getBoundingClientRect().toJSON()
    const {x, y, width, height} = rect
    const viewportWidth = width * dpr
    const viewportHeight = height * dpr

    this.rect = {...rect, cx: x + width / 2, cy: y + height / 2}
    this.viewportRect = generateBoundingRectFromTwoPoints(
      {x: 0, y: 0},
      {x: viewportWidth, y: viewportHeight},
    )
    /*
        this.mainHost.setSize(viewportWidth, viewportHeight)
        this.overlayHost.setSize(viewportWidth, viewportHeight)*/
  }

  regenerateOverlayElements() {
    const selectedElements = this.mainHost.getVisibleElementsByIdSet(this.selection.values)
    const noDetectElements = this.interaction._draggingElements.length > 0
    const noHandles = this.interaction._rotateData || this.interaction._resizingData || this.interaction._draggingElements.length > 0
    // const noBounding = !!this.interaction._rotateData

    if (noDetectElements) return
    generateElementsDetectArea.call(this)

    if (selectedElements.length > 0) {
      // if (noBounding) return
      const ele = generateSelectedBoundingElement.call(this)

      if (noHandles) return

      generateAnchorAndPath.call(this)
      generateTransformHandles.call(this, ele)

    }
  }

  destroy() {
    // this.destroy()
    this.action.destroy()
    this.history.destroy()
    this.mainHost.destroy()
    this.overlayHost.destroy()

    // this.eventManager.destroy()
    this.action.destroy()
    // this.visible.destroy()
    this.clipboard.destroy()
    this.interaction.destroy()
    this.world.destroy()
    this.toolManager.destroy()
    this.cursor.destroy()
    this.history.destroy()
    this.selection.destroy()
    this.assetsManager.destroy()
    this.mainHost.destroy()
    this.resizeObserver.disconnect()

  }
}

export default Editor
