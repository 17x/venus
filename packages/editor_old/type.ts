import {VisionEventData, VisionEventType} from '~/services/actions/type'
import {Unit} from './index'

export type UID = string

export interface Size {
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

export type Rect = Size & Point
export type CenterBasedRect = Size & {
  cx: number;
  cy: number;
}
export type BoundingRect = Size & Point & {
  top: number;
  bottom: number;
  left: number;
  right: number;
  cx: number;
  cy: number;
}
export type Resolution = Size
export type DPR = number
export type ZoomRatio = number

export type UnitType = Unit.MM | Unit.INCHES | Unit.PX | Unit.CM;
export type {VisionEventData, VisionEventType}
// export type {UID, HexColor}

// export type * from './core/core.d'
// export type * from '~/services/assets/asssetsManager'
// export type {ElementProps}
export type {ElementProps} from './elements/type'

export type  {
  InitializedHandler,
  HistoryUpdatedHandler,
  ElementsUpdatedHandler,
  SelectionUpdatedHandler,
  ViewportUpdatedHandler,
  WorldUpdatedHandler,
  WorldMouseMoveUpdatedHandler,
  ContextMenuHandler,
  ElementCopiedHandler,
  SwitchToolHandler,
} from './main/type'

export type {ElementInstance} from './elements/type'
export type {ToolName} from './services/tool/toolManager'