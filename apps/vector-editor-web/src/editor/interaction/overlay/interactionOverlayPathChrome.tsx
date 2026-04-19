import type {CanvasPresentationConfig} from '@vector/runtime'
import type {PathSubSelection} from '../types.ts'

interface PathHandleLink {
  anchor: {x: number; y: number}
  handle: {x: number; y: number}
  handleType: 'inHandle' | 'outHandle'
  anchorIndex: number
}

export function InteractionOverlayPathChrome(props: {
  activePathShapeId?: string
  activePathAnchors: Array<{x: number; y: number}>
  activePathHandleLinks: PathHandleLink[]
  activePathSubSelection: PathSubSelection | null
  highlightedSegment: {from: {x: number; y: number}; to: {x: number; y: number}} | null
  presentation: CanvasPresentationConfig
}) {
  return (
    <>
      {props.highlightedSegment && (
        <line
          role="presentation"
          x1={props.highlightedSegment.from.x}
          y1={props.highlightedSegment.from.y}
          x2={props.highlightedSegment.to.x}
          y2={props.highlightedSegment.to.y}
          stroke={props.presentation.overlay.hoverStroke}
          strokeWidth={props.presentation.overlay.selectionStrokeWidth + 0.5}
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      )}

      {props.activePathAnchors.map((anchor, index) => {
        const selectedAnchor = props.activePathSubSelection?.hitType === 'anchorPoint' && props.activePathSubSelection.anchorPoint?.index === index
        return (
          <circle
            role="presentation"
            key={`path-anchor:${props.activePathShapeId}:${index}`}
            cx={anchor.x}
            cy={anchor.y}
            r={selectedAnchor ? 4 : 3}
            fill={selectedAnchor ? props.presentation.overlay.selectionStroke : '#ffffff'}
            stroke={selectedAnchor ? '#ffffff' : props.presentation.overlay.hoverStroke}
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
        )
      })}

      {props.activePathHandleLinks.map((link) => {
        const selectedHandle =
          props.activePathSubSelection?.hitType === link.handleType &&
          props.activePathSubSelection.handlePoint?.anchorIndex === link.anchorIndex

        return (
          <g key={`path-handle:${props.activePathShapeId}:${link.anchorIndex}:${link.handleType}`}>
            <line
              role="presentation"
              x1={link.anchor.x}
              y1={link.anchor.y}
              x2={link.handle.x}
              y2={link.handle.y}
              stroke={props.presentation.overlay.hoverStroke}
              strokeWidth={1}
              strokeDasharray="3 2"
              vectorEffect="non-scaling-stroke"
            />
            <circle
              role="presentation"
              cx={link.handle.x}
              cy={link.handle.y}
              r={selectedHandle ? 4 : 3}
              fill={selectedHandle ? props.presentation.overlay.selectionStroke : '#ffffff'}
              stroke={props.presentation.overlay.hoverStroke}
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          </g>
        )
      })}
    </>
  )
}