const conversionFactors = {
  mmToCm: 0.1,            // 1 mm = 0.1 cm
  cmToMm: 10,             // 1 cm = 10 mm
  mmToInches: 0.0393701,  // 1 mm = 0.0393701 inches
  inchesToMm: 25.4,       // 1 inch = 25.4 mm
  cmToInches: 0.393701,   // 1 cm = 0.393701 inches
  inchesToCm: 2.54,       // 1 inch = 2.54 cm
  pxToInches: 1 / 96,     // 1 px = 1/96 inches (standard screen DPI)
  pxToCm: 1 / 37.795275591, // 1 px = 1/37.795 cm (standard screen DPI)
}

// Define explicit functions for each unit conversion
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

// Unit Map for converting between units
const unitMap: { [key: string]: { [key: string]: Function } } = {
  'mm': {
    'cm': convertMmToCm,
    'inches': convertMmToInches,
    'px': convertMmToPx,
  },
  'cm': {
    'mm': convertCmToMm,
    'inches': convertCmToInches,
    'px': convertCmToPx,
  },
  'inches': {
    'mm': convertInchesToMm,
    'cm': convertInchesToCm,
    'px': convertInchesToPx,
  },
  'px': {
    'mm': convertPxToMm,
    'cm': convertPxToCm,
    'inches': convertPxToInches,
  },
}

const convertUnit = (value: number, fromUnit: string, toUnit: string, dpi: number = 72): number => {
  // Check if conversion exists in the unitMap object and apply the corresponding function
  if (unitMap[fromUnit] && unitMap[fromUnit][toUnit]) {
    const conversionFn = unitMap[fromUnit][toUnit]
    return conversionFn(value, dpi)
  }

  // If no valid conversion is found, return NaN or throw an error
  return NaN
}

export default convertUnit