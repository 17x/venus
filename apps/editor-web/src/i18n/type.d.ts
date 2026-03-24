import {HistoryActionType} from "../editor/engine/type"

export interface I18nHistoryDataItem {
  label: string
  tooltip: string
}

export type I18nHistoryRecord = Record<HistoryActionType, I18nHistoryDataItem>