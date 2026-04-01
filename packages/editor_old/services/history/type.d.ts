import {HistoryChangeItem} from '~/services/actions/type'

type HistoryPrev = HistoryNode | null
type HistoryNext = HistoryPrev
type HistorySelectedElements = Set<UID>
type HistoryElements = ElementProps[] | UID[]
/*
export type HistoryOperationType =
  'history-init'
  | 'history-add'
  | 'history-delete'
  | 'history-paste'
  | 'history-duplicate'
  | 'history-modify'
  | 'history-move'
  | 'history-reorder'
  | 'history-select'
  | 'history-group'
  | 'history-ungroup'
  | 'history-composite'*/

export interface HistoryOperationPayloadMap {
  'history-init': {
    state: null;
    selectedElements: HistorySelectedElements;
  };
  'history-add': {
    elements: HistoryElements;
    selectedElements: HistorySelectedElements;
  };
  'history-delete': {
    elements: HistoryElements;
    selectedElements: HistorySelectedElements;
  };
  'history-paste': {
    elements: HistoryElements;
    selectedElements: HistorySelectedElements;
  };
  'history-duplicate': {
    elements: HistoryElements;
    selectedElements: HistorySelectedElements;
  };
  'history-modify': {
    changes: HistoryChangeItem[];
    selectedElements: HistorySelectedElements;
  };
  'history-move': {
    delta: { x: number; y: number };
    selectedElements: HistorySelectedElements;
  };
  'history-reorder': {
    from: string[];
    to: string[];
    selectedElements: HistorySelectedElements;
  };
  'history-group': {
    groupId: string;
    children: string[];
    selectedElements: HistorySelectedElements;
  };
  'history-ungroup': {
    groupId: string;
    children: HistoryElements;
    selectedElements: HistorySelectedElements;
  };
  'history-composite': {
    actions: HistoryOperation[];
    selectedElements: HistorySelectedElements;
  };
}

export type HistoryOperationMap = {
  [K in keyof HistoryOperationPayloadMap]: {
    type: K;
    payload: HistoryOperationPayloadMap[K];
  };
};

export type HistoryOperation = HistoryOperationMap[keyof HistoryOperationMap]