import {Unit, UnitType} from '@vector/model'

export interface PagePreset {
  name: string
  unit: UnitType
  width: number
  height: number
  icon?: string
  description?: string
}

export const PAGE_PRESETS: PagePreset[] = [
  {
    name: 'A4',
    unit: Unit.MM,
    width: 210,
    height: 297,
  },
  {
    name: 'Letter',
    unit: Unit.INCHES,
    width: 8.5,
    height: 11,
  },
  {
    name: 'Legal',
    unit: Unit.INCHES,
    width: 8.5,
    height: 14,
  },
  {
    name: 'A5',
    unit: Unit.MM,
    width: 148,
    height: 210,
  },
  {
    name: 'Tabloid',
    unit: Unit.INCHES,
    width: 11,
    height: 17,
  },
  {
    name: 'iPhone 14 Pro',
    unit: Unit.PX,
    width: 1179,
    height: 2556,
  },
  {
    name: '1080p Full HD',
    unit: Unit.PX,
    width: 1920,
    height: 1080,
  },
  {
    name: 'Square Notebook',
    unit: Unit.CM,
    width: 20,
    height: 20,
  },
  {
    name: 'Instagram Post',
    unit: Unit.PX,
    width: 1080,
    height: 1080,
  },
  {
    name: 'Poster A1',
    unit: Unit.MM,
    width: 594,
    height: 841,
  },
]
