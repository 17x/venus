const conversionFactors = {
  mmToCm: 0.1,
  cmToMm: 10,
  mmToInches: 0.0393701,
  inchesToMm: 25.4,
  cmToInches: 0.393701,
  inchesToCm: 2.54,
} as const

const convertMmToCm = (value: number) => value * conversionFactors.mmToCm
const convertCmToMm = (value: number) => value * conversionFactors.cmToMm
const convertMmToInches = (value: number) => value * conversionFactors.mmToInches
const convertInchesToMm = (value: number) => value * conversionFactors.inchesToMm
const convertCmToInches = (value: number) => value * conversionFactors.cmToInches
const convertInchesToCm = (value: number) => value * conversionFactors.inchesToCm
const convertPxToInches = (value: number, dpi: number) => value / dpi
const convertInchesToPx = (value: number, dpi: number) => value * dpi
const convertPxToCm = (value: number, dpi: number) => (value / dpi) * 2.54
const convertCmToPx = (value: number, dpi: number) => (value / 2.54) * dpi
const convertMmToPx = (value: number, dpi: number) => (value / 25.4) * dpi
const convertPxToMm = (value: number, dpi: number) => (value / dpi) * 25.4

type UnitConverter = (value: number, dpi: number) => number

const unitMap: Record<string, Record<string, UnitConverter>> = {
  mm: {
    cm: convertMmToCm,
    inches: convertMmToInches,
    px: convertMmToPx,
  },
  cm: {
    mm: convertCmToMm,
    inches: convertCmToInches,
    px: convertCmToPx,
  },
  inches: {
    mm: convertInchesToMm,
    cm: convertInchesToCm,
    px: convertInchesToPx,
  },
  px: {
    mm: convertPxToMm,
    cm: convertPxToCm,
    inches: convertPxToInches,
  },
}

export const convertUnit = (
  value: number,
  fromUnit: string,
  toUnit: string,
  dpi: number = 72,
): number => {
  if (fromUnit === toUnit) {
    return value
  }

  const conversionFn = unitMap[fromUnit]?.[toUnit]

  if (!conversionFn) {
    return Number.NaN
  }

  return conversionFn(value, dpi)
}

export default convertUnit
