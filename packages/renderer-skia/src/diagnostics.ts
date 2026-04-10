import * as React from 'react'

export interface SkiaRenderDiagnostics {
  tileCount: number
  visibleShapeCount: number
  staticShapeCount: number
  overlayShapeCount: number
  cacheHits: number
  cacheMisses: number
  rebuiltTiles: number
  drawMs: number
  recordMs: number
}

const EMPTY_DIAGNOSTICS: SkiaRenderDiagnostics = {
  tileCount: 0,
  visibleShapeCount: 0,
  staticShapeCount: 0,
  overlayShapeCount: 0,
  cacheHits: 0,
  cacheMisses: 0,
  rebuiltTiles: 0,
  drawMs: 0,
  recordMs: 0,
}

let currentDiagnostics = EMPTY_DIAGNOSTICS
const diagnosticsListeners = new Set<VoidFunction>()

export function publishSkiaDiagnostics(nextDiagnostics: SkiaRenderDiagnostics) {
  if (areDiagnosticsEqual(currentDiagnostics, nextDiagnostics)) {
    return
  }

  currentDiagnostics = nextDiagnostics
  diagnosticsListeners.forEach((listener) => listener())
}

export function useSkiaRenderDiagnostics() {
  return React.useSyncExternalStore(
    (listener) => {
      diagnosticsListeners.add(listener)
      return () => {
        diagnosticsListeners.delete(listener)
      }
    },
    () => currentDiagnostics,
    () => EMPTY_DIAGNOSTICS,
  )
}

function areDiagnosticsEqual(
  left: SkiaRenderDiagnostics,
  right: SkiaRenderDiagnostics,
) {
  return (
    left.tileCount === right.tileCount &&
    left.visibleShapeCount === right.visibleShapeCount &&
    left.staticShapeCount === right.staticShapeCount &&
    left.overlayShapeCount === right.overlayShapeCount &&
    left.cacheHits === right.cacheHits &&
    left.cacheMisses === right.cacheMisses &&
    left.rebuiltTiles === right.rebuiltTiles &&
    left.drawMs === right.drawMs &&
    left.recordMs === right.recordMs
  )
}
