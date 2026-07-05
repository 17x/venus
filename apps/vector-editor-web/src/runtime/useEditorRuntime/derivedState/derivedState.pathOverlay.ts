import {useMemo} from 'react'
import type {EditorDocument} from '../../model/index.ts'
import type {PathSubSelection} from '../../interaction/index.ts'

/**
 * Resolves path-anchor/segment/curve overlay geometry from active path edit state.
 * @param input Active path shape and sub-selection context.
 */
export function useEditorRuntimeDerivedPathOverlay(input: {
  activePathShape: EditorDocument['shapes'][number] | null
  activePathSubSelection: PathSubSelection | null
}) {
  const activePathAnchors = useMemo(() => {
    if (!input.activePathShape) {
      return [] as Array<{x: number; y: number}>
    }
    if (Array.isArray(input.activePathShape.bezierPoints) && input.activePathShape.bezierPoints.length > 0) {
      return input.activePathShape.bezierPoints.map((point) => ({
        x: point.anchor.x,
        y: point.anchor.y,
      }))
    }
    return (input.activePathShape.points ?? []).map((point) => ({x: point.x, y: point.y}))
  }, [input.activePathShape])

  const activePathHandleLinks = useMemo(() => {
    if (!input.activePathShape || !Array.isArray(input.activePathShape.bezierPoints)) {
      return [] as Array<{anchor: {x: number; y: number}; handle: {x: number; y: number}; handleType: 'inHandle' | 'outHandle'; anchorIndex: number}>
    }

    return input.activePathShape.bezierPoints.flatMap((point, anchorIndex) => {
      const links: Array<{anchor: {x: number; y: number}; handle: {x: number; y: number}; handleType: 'inHandle' | 'outHandle'; anchorIndex: number}> = []
      if (point.cp1) {
        const override =
          input.activePathSubSelection?.hitType === 'inHandle' &&
          input.activePathSubSelection.handlePoint?.anchorIndex === anchorIndex
            ? input.activePathSubSelection.handlePoint
            : null
        links.push({
          anchor: {x: point.anchor.x, y: point.anchor.y},
          handle: override ? {x: override.x, y: override.y} : {x: point.cp1.x, y: point.cp1.y},
          handleType: 'inHandle',
          anchorIndex,
        })
      }
      if (point.cp2) {
        const override =
          input.activePathSubSelection?.hitType === 'outHandle' &&
          input.activePathSubSelection.handlePoint?.anchorIndex === anchorIndex
            ? input.activePathSubSelection.handlePoint
            : null
        links.push({
          anchor: {x: point.anchor.x, y: point.anchor.y},
          handle: override ? {x: override.x, y: override.y} : {x: point.cp2.x, y: point.cp2.y},
          handleType: 'outHandle',
          anchorIndex,
        })
      }
      return links
    })
  }, [input.activePathShape, input.activePathSubSelection])

  const highlightedSegment = useMemo(() => {
    if (
      !input.activePathSubSelection ||
      input.activePathSubSelection.hitType !== 'segment' ||
      !input.activePathSubSelection.segment ||
      input.activePathSubSelection.segment.segmentType !== 'line' ||
      activePathAnchors.length < 2
    ) {
      return null
    }
    const from = activePathAnchors[input.activePathSubSelection.segment.index]
    const to = activePathAnchors[input.activePathSubSelection.segment.index + 1]
    if (!from || !to) {
      return null
    }
    return {from, to}
  }, [activePathAnchors, input.activePathSubSelection])

  const highlightedCurvePoints = useMemo(() => {
    if (
      !input.activePathSubSelection ||
      input.activePathSubSelection.hitType !== 'segment' ||
      !input.activePathSubSelection.segment ||
      input.activePathSubSelection.segment.segmentType !== 'curve' ||
      !input.activePathShape ||
      !Array.isArray(input.activePathShape.bezierPoints)
    ) {
      return null
    }

    const segmentIndex = input.activePathSubSelection.segment.index
    const from = input.activePathShape.bezierPoints[segmentIndex]
    const to = input.activePathShape.bezierPoints[segmentIndex + 1]
    if (!from || !to) {
      return null
    }

    const p0 = from.anchor
    const p1 = from.cp2 ?? from.anchor
    const p2 = to.cp1 ?? to.anchor
    const p3 = to.anchor
    const sampledPoints: Array<{x: number; y: number}> = []

    for (let step = 0; step <= 24; step += 1) {
      const t = step / 24
      const oneMinusT = 1 - t
      sampledPoints.push({
        x:
          oneMinusT * oneMinusT * oneMinusT * p0.x +
          3 * oneMinusT * oneMinusT * t * p1.x +
          3 * oneMinusT * t * t * p2.x +
          t * t * t * p3.x,
        y:
          oneMinusT * oneMinusT * oneMinusT * p0.y +
          3 * oneMinusT * oneMinusT * t * p1.y +
          3 * oneMinusT * t * t * p2.y +
          t * t * t * p3.y,
      })
    }

    return sampledPoints
  }, [input.activePathShape, input.activePathSubSelection])

  return {
    activePathAnchors,
    activePathHandleLinks,
    highlightedSegment,
    highlightedCurvePoints,
  }
}
