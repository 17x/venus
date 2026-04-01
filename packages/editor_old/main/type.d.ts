import {ElementProps} from '~/elements/type'
import History from '~/services/history/history'
import {EditorConfig} from './editor'
import {ToolName} from '~/services/tool/toolManager'
import {Point, VisionEditorAssetType} from '~/type'

export type ElementMoveDirection =
  'element-move-up' |
  'element-move-down' |
  'element-move-left' |
  'element-move-right' |
  'element-move-shift'

export type EditorAction = {
  id: string;
  shortcut?: string;
  children?: EditorAction[];
};

export interface ViewportData extends Size {
  offsetX: number
  offsetY: number
  scale: number
  // dx: number
  // dy: number
  // status: string
}

export interface WorldInfo extends Size {
  offsetX: number
  offsetY: number
  scale: number
  dx: number
  dy: number
  status: string
}

export interface SnapPointData extends Point {
  id: UID,
  type: string
  label?: string
}

export type InitializedHandler = () => void;
export type HistoryUpdatedHandler = (history: History) => void;
export type ElementsUpdatedHandler = (elementMap: elementMap) => void;
export type SelectionUpdatedHandler = (selected: Set<UID>, selectedProps?: ElementProps) => void;
export type ViewportUpdatedHandler = (viewportInfo: ViewportData) => void;
export type ZoomHandler = (scale: number) => void;
export type WorldUpdatedHandler = (worldInfo: WorldInfo) => void;
export type WorldMouseMoveUpdatedHandler = (point: Point) => void;
export type ContextMenuHandler = (position: Point) => void;
export type ElementCopiedHandler = (ElementProps) => void;
export type SwitchToolHandler = (toolName: ToolName) => void;

export declare type EventHandlers = {
  onInitialized?: InitializedHandler
  onHistoryUpdated?: HistoryUpdatedHandler
  onElementsUpdated?: ElementsUpdatedHandler
  onSelectionUpdated?: SelectionUpdatedHandler
  onViewportUpdated?: ViewportUpdatedHandler
  onZoomed?: ZoomHandler
  onWorldUpdated?: WorldUpdatedHandler
  onWorldMouseMove?: WorldMouseMoveUpdatedHandler
  onContextMenu?: ContextMenuHandler
  onElementCopied?: ElementCopiedHandler
  onSwitchTool?: SwitchToolHandler
}

export interface EditorExportFileType {
  elements: ElementProps[],
  assets: VisionEditorAssetType[],
  config: { scale: number, offset: { x: number, y: number } }
}

export interface EditorConfig {
  dpr: number;
  drawCrossLineDefault?: boolean
  drawCrossLine?: boolean
  page: {
    // name: string
    unit: string
    width: number
    height: number
  }
}

export interface EditorInterface {
  container: HTMLDivElement
  elements: ElementProps[]
  events?: EventHandlers;
  config: EditorConfig;
}