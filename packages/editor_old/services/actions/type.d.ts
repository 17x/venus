import {SelectionActionMode} from '../selection/type'
import {HistoryNode} from '~/services/history/DoublyLinkedList'
// import {ElementMoveDirection} from '../type'
import {HistoryOperation} from '~/services/history/type'
import {ElementInstance, ElementProps, ElementPropsWithoutIdentifiers} from '~/elements/type'
import {VisionEditorAssetType} from '~/services/assets/AssetsManager'
import {Point} from '~/type'
import {ToolName} from '~/services/tool/toolManager'

export interface SelectionModifyData {
  mode: SelectionActionMode;
  idSet: Set<UID>;
}

export type VisionEventType = keyof VisionEventMap;
export type VisionEventData<T extends VisionEventType> = VisionEventMap[T];

export type ElementMoveData = {
  idSet?: Set<UID>;
  // direction: ElementMoveDirection;
  delta: Point;
};

/*export type ElementChangeProps = {
  [K in keyof ElementProps]?: PropChange<ElementProps[K]> | PropMoveOffset
}*/
export type HistoryChangeItem = {
  id: UID
  type?: 'expand' | 'props'
  from: Partial<ElementProps>
  to: Partial<ElementProps>
}

export interface ElementModifyData {
  id: UID
  props: ElementProps
}

export type VisionEventMap = {
  // 'editor-initialized': never;
  'world-resized': null;
  'world-mouse-down': never;
  'world-mouse-move': never;
  'world-mouse-up': never;
  'world-transformed': never;
  'world-scale-changed': never;
  'world-fit-content': never
  'world-zoom': 'fit' | {
    zoomBy?: boolean
    zoomTo?: boolean
    zoomFactor: number;
    physicalPoint?: Point;
  };
  'world-shift': Point;
  'rerender-main-host': boolean;
  'rerender-overlay': never;
  'clear-creation': never;
  'selection-updated': never
  'selection-modify': SelectionModifyData;
  'selection-clear': never;
  'selection-all': never;
  'drop-image': { position: Point, assets: VisionEditorAssetType[] };
  'element-updated': HistoryOperation;
  'element-copy': never;
  'element-add': ElementPropsWithoutIdentifiers[];
  'element-paste': Point;
  'element-delete': never;
  'element-duplicate': never;
  'element-layer': { method: 'up' | 'down' | 'top' | 'bottom', idSet: Set<UID> };
  'element-move-up': never;
  'element-move-right': never;
  'element-move-down': never;
  'element-move-left': never;
  'element-move': ElementMoveData;
  'element-moving': ElementMoveData;
  'element-modified': HistoryChangeItem[]
  'element-replace': {from:ElementInstance, to:ElementInstance }[]
  'element-modify': {id:UID,props:Partial<ElementProps>}[]
  'element-modifying': {
    type: 'move' | 'resize' | 'rotate',
    data: Partial<ElementProps>[]
  }
  'element-hover-enter': UID;
  'element-hover-leave': UID;
  'reset-overlay': never;
  'visible-element-updated': never;
  'visible-selection-updated': never;
  'history-redo': never;
  'history-undo': never;
  'history-pick': HistoryNode;
  'switch-tool': ToolName;
  'context-menu': {
    idSet: Set<UID>;
    position: Position;
    copiedItems: boolean
  };
}

const forwardEventDependencyMap: Record<VisionEventType, VisionEventType[]> = {
  'world-resized': ['world-transformed'],
  // 'editor-initialized': ['world-updated'],
  'world-transformed': ['visible-element-updated'],
  'world-zoom': ['world-transformed'],
  'world-shift': ['world-transformed'],
  /* selections */
  'selection-all': ['selection-updated'],
  'selection-clear': ['selection-updated'],
  'selection-modify': ['selection-updated'],
  'selection-updated': ['visible-selection-updated'],
  'visible-selection-updated': ['rerender-overlay'],
  'rerender-overlay': [],
  'element-hover-enter': ['visible-selection-updated'],
  'element-hover-leave': ['visible-selection-updated'],
  /* elements */
  'element-add': ['element-updated'],
  'element-delete': ['element-updated'],
  'element-move': ['element-updated'],
  'element-paste': ['element-updated'],
  'element-duplicate': ['element-updated'],
  'element-modifying': ['element-updated'],
  'element-replace': ['element-updated'],
  'element-updated': ['visible-element-updated', 'selection-updated'],
  'visible-element-updated': ['rerender-main-host', 'visible-selection-updated'],
  'rerender-main-host': [],
  'context-menu': [],
  'element-copy': [],
  /* history */
  'history-undo': ['element-updated'],
  'history-redo': ['element-updated'],
  'history-pick': ['element-updated'],
} as const
