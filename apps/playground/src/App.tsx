import * as React from 'react'
import {nid, type DocumentNode, type EditorDocument} from '@venus/document-core'
import type {EditorRuntimeCommand} from '@venus/runtime/worker'
import {resolveRuntimeZoomPresetScale} from '@venus/runtime/interaction'
import {useDefaultCanvasRuntime} from '@venus/runtime/react'
import {
  Canvas2DRenderer,
  CanvasSelectionOverlay,
  CanvasViewport,
  useCanvas2DRenderDiagnostics,
} from './runtime/canvasAdapter.tsx'
import type {EngineBackend} from '@venus/engine'
import {MOCK_DOCUMENT} from './mockDocument.ts'
import {createStressDocument} from './sceneGenerator.ts'
import './index.css'

type PlaygroundDocumentPreset =
  | 'demo'
  | 'medium-stress'
  | 'large-stress'
  | 'stress'
  | 'extreme-stress'
  | 'image-heavy'
  | 'image-heavy-large'

interface PlaygroundDocumentSelection {
  preset: PlaygroundDocumentPreset
  revision: number
}

const MEDIUM_STRESS_SHAPE_COUNT = 10_000
const LARGE_STRESS_SHAPE_COUNT = 50_000
const STRESS_SHAPE_COUNT = 100_000
const EXTREME_STRESS_SHAPE_COUNT = 1_000_000
const PLAYGROUND_SCENE_BUTTONS: Array<{
  label: string
  preset: PlaygroundDocumentPreset
}> = [
  {label: 'Demo', preset: 'demo'},
  {label: '10k', preset: 'medium-stress'},
  {label: '50k', preset: 'large-stress'},
  {label: '100k', preset: 'stress'},
  {label: '1000k', preset: 'extreme-stress'},
  {label: '10k Img+', preset: 'image-heavy'},
  {label: '50k Img+', preset: 'image-heavy-large'},
]

function cloneDocument(document: EditorDocument): EditorDocument {
  return structuredClone(document)
}

function resolveDocument(selection: PlaygroundDocumentSelection): EditorDocument {
  switch (selection.preset) {
    case 'medium-stress':
      return createStressDocument(MEDIUM_STRESS_SHAPE_COUNT)
    case 'large-stress':
      return createStressDocument(LARGE_STRESS_SHAPE_COUNT)
    case 'stress':
      return createStressDocument(STRESS_SHAPE_COUNT)
    case 'extreme-stress':
      return createStressDocument(EXTREME_STRESS_SHAPE_COUNT)
    case 'image-heavy':
      return createStressDocument(MEDIUM_STRESS_SHAPE_COUNT, {imageDensity: 'high'})
    case 'image-heavy-large':
      return createStressDocument(LARGE_STRESS_SHAPE_COUNT, {imageDensity: 'high'})
    case 'demo':
    default:
      return cloneDocument(MOCK_DOCUMENT)
  }
}

function createGeneratedImageDataUrl(label: string, width: number, height: number) {
  const hue = Math.floor(Math.random() * 360)
  const accentHue = (hue + 36) % 360
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="hsl(${hue} 76% 70%)" />
          <stop offset="100%" stop-color="hsl(${accentHue} 82% 54%)" />
        </linearGradient>
      </defs>
      <rect width="${width}" height="${height}" rx="24" fill="url(#bg)" />
      <circle cx="${Math.round(width * 0.78)}" cy="${Math.round(height * 0.28)}" r="${Math.round(Math.min(width, height) * 0.15)}" fill="rgba(255,255,255,0.24)" />
      <path d="M0 ${Math.round(height * 0.7)} C ${Math.round(width * 0.2)} ${Math.round(height * 0.48)}, ${Math.round(width * 0.48)} ${Math.round(height * 0.92)}, ${width} ${Math.round(height * 0.64)} L ${width} ${height} L 0 ${height} Z" fill="rgba(15,23,42,0.16)" />
      <text x="24" y="${Math.round(height * 0.46)}" font-family="Arial, sans-serif" font-size="${Math.max(18, Math.round(width * 0.11))}" font-weight="700" fill="white">${label}</text>
    </svg>
  `.trim()

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

function createRandomShape(): DocumentNode {
  const x = 80 + Math.round(Math.random() * 720)
  const y = 80 + Math.round(Math.random() * 420)
  const width = 120 + Math.round(Math.random() * 120)
  const height = 80 + Math.round(Math.random() * 100)
  const roll = Math.random()

  if (roll < 0.34) {
    return {
      id: nid(),
      type: 'rectangle',
      name: 'Rectangle',
      x,
      y,
      width,
      height,
      fill: {
        enabled: true,
        color: '#f8fafc',
      },
      stroke: {
        enabled: true,
        color: '#0f172a',
        weight: 1,
      },
    }
  }

  if (roll < 0.67) {
    const imageWidth = 180 + Math.round(Math.random() * 120)
    const imageHeight = 120 + Math.round(Math.random() * 80)
    const label = `Mock ${Math.floor(Math.random() * 100)}`

    return {
      id: nid(),
      type: 'image',
      name: label,
      assetUrl: createGeneratedImageDataUrl(label, imageWidth, imageHeight),
      x,
      y,
      width: imageWidth,
      height: imageHeight,
    }
  }

  return {
    id: nid(),
    type: 'text',
    name: 'Text',
    text: 'Playground',
    x,
    y,
    width: 220,
    height: 42,
  }
}

function formatShapeSummary(document: EditorDocument) {
  const counts = new Map<string, number>()
  document.shapes.forEach((shape) => {
    counts.set(shape.type, (counts.get(shape.type) ?? 0) + 1)
  })

  return Array.from(counts.entries())
    .sort((left, right) => right[1] - left[1])
    .slice(0, 6)
    .map(([type, count]) => `${type}:${count}`)
    .join('  ')
}

function App() {
  const [selection, setSelection] = React.useState<PlaygroundDocumentSelection>({
    preset: 'demo',
    revision: 0,
  })
  const document = React.useMemo(
    () => resolveDocument(selection),
    [selection],
  )
  const [strictStrokeHitTest, setStrictStrokeHitTest] = React.useState(false)
  const createWorker = React.useCallback(
    () => new Worker(new URL('./editor.worker.ts', import.meta.url), {type: 'module'}),
    [],
  )
  const runtime = useDefaultCanvasRuntime({
    capacity: Math.max(256, document.shapes.length + 8),
    createWorker,
    document,
    allowFrameSelection: false,
    strictStrokeHitTest,
    selection: {
      allowFrameSelection: false,
      input: {
        singleClick: 'replace',
        shiftClick: 'add',
        metaOrCtrlClick: 'toggle',
        altClick: 'subtract',
      },
      marquee: {
        enabled: true,
        defaultMatchMode: 'contain',
        shiftMatchMode: 'contain',
      },
    },
    snappingPreset: 'bounds',
  })
  const [preferredEngineBackend, setPreferredEngineBackend] = React.useState<EngineBackend>(() => {
    if (typeof window === 'undefined') {
      return 'webgl'
    }

    const requested = new URLSearchParams(window.location.search).get('engineBackend')
    return requested === 'canvas2d' ? 'canvas2d' : 'webgl'
  })
  const runtimeRenderer = React.useMemo(
    () => function PlaygroundRuntimeRenderer(props: Parameters<typeof Canvas2DRenderer>[0]) {
      return <Canvas2DRenderer {...props} backend={preferredEngineBackend} />
    },
    [preferredEngineBackend],
  )
  const snapshot = runtime

  const renderDiagnostics = useCanvas2DRenderDiagnostics()
  const overlayRenderer = React.useMemo(
    () => function PlaygroundOverlay(props: Parameters<typeof CanvasSelectionOverlay>[0]) {
      return <CanvasSelectionOverlay {...props} />
    },
    [],
  )

  const dispatch = React.useCallback((command: EditorRuntimeCommand) => {
    if (command.type === 'viewport.fit') {
      runtime.fitViewport()
      return
    }

    if (command.type === 'viewport.zoomIn' || command.type === 'viewport.zoomOut') {
      const nextScale = resolveRuntimeZoomPresetScale(
        runtime.viewport.scale,
        command.type === 'viewport.zoomIn' ? 'in' : 'out',
      )
      if (nextScale !== null) {
        runtime.zoomViewport(nextScale)
      }
      return
    }

    runtime.dispatchCommand(command)
  }, [runtime])

  const selectedShape = snapshot.stats.selectedIndex >= 0
    ? snapshot.shapes[snapshot.stats.selectedIndex] ?? null
    : null
  const panelClass = 'flex flex-col gap-2 rounded-xl border border-slate-700/35 bg-slate-950/55 p-3 backdrop-blur'
  const controlButtonClass = 'cursor-pointer rounded-lg border border-slate-500/25 bg-slate-800/75 px-2.5 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-cyan-300/55 hover:bg-cyan-500/20 active:scale-[0.99]'

  return (
    <main className="relative flex h-full w-full min-h-0 min-w-0 flex-col overflow-hidden bg-[radial-gradient(circle_at_88%_-10%,rgba(14,165,233,0.18),transparent_30%),radial-gradient(circle_at_12%_0%,rgba(56,189,248,0.12),transparent_26%),linear-gradient(180deg,rgba(15,23,42,0.98),rgba(2,6,23,1))] text-slate-100">
      <header className="border-b border-slate-700/35 bg-slate-950/55 px-4 py-3 backdrop-blur-md sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <strong className="block text-sm font-semibold uppercase tracking-[0.08em] text-cyan-200">Runtime Playground</strong>
            <p className="truncate text-xs text-slate-300/75">Canvas2D runtime chain: runtime-react -&gt; runtime -&gt; runtime/worker -&gt; engine</p>
          </div>
          <span className="rounded-full border border-cyan-300/35 bg-cyan-500/12 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-cyan-100">diagnostics</span>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 min-w-0 grid-rows-[minmax(0,auto)_minmax(0,1fr)] lg:grid-cols-[300px_minmax(0,1fr)] lg:grid-rows-1">
        <aside className="min-h-0 min-w-0 overflow-y-auto border-b border-slate-700/35 bg-slate-950/45 p-3 lg:border-r lg:border-b-0">
          <div className="flex min-h-0 min-w-0 flex-col gap-3">
            <section className={panelClass}>
          <div className="flex flex-col gap-1">
            <strong className="text-[13px] uppercase tracking-[0.04em] text-slate-50">Scenes</strong>
            <span className="text-xs text-slate-200/70">Switch document presets</span>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {PLAYGROUND_SCENE_BUTTONS.map((item) => (
              <button
                key={item.preset}
                type="button"
                className={[
                  'cursor-pointer rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition text-left',
                  'border-slate-500/20 bg-slate-800/75 text-slate-200 hover:border-sky-400/45 hover:bg-sky-500/18',
                  selection.preset === item.preset
                    ? 'border-sky-400/70 bg-sky-400/22 text-sky-50'
                    : '',
                ].join(' ')}
                onClick={() => {
                  setSelection((current) => ({
                    preset: item.preset,
                    revision: current.preset === item.preset ? current.revision + 1 : 0,
                  }))
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
            </section>

            <section className={panelClass}>
          <div className="flex flex-col gap-1">
            <strong className="text-[13px] uppercase tracking-[0.04em] text-slate-50">Renderer</strong>
            <span className="text-xs text-slate-200/70">Switch backend request mode and hit-test strategy</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {(['webgl', 'canvas2d'] as EngineBackend[]).map((backend) => (
              <button
                key={backend}
                type="button"
                className={[
                  'cursor-pointer rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition text-left',
                  'border-slate-500/20 bg-slate-800/75 text-slate-200 hover:border-cyan-400/45 hover:bg-cyan-500/18',
                  preferredEngineBackend === backend
                    ? 'border-cyan-400/70 bg-cyan-400/22 text-cyan-50'
                    : '',
                ].join(' ')}
                onClick={() => {
                  setPreferredEngineBackend(backend)
                }}
              >
                {backend}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              className={[
                'cursor-pointer rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition text-left',
                'border-slate-500/20 bg-slate-800/75 text-slate-200 hover:border-cyan-400/45 hover:bg-cyan-500/18',
                strictStrokeHitTest
                  ? 'border-cyan-400/70 bg-cyan-400/22 text-cyan-50'
                  : '',
              ].join(' ')}
              onClick={() => {
                setStrictStrokeHitTest(true)
              }}
            >
              stroke-only hit
            </button>
            <button
              type="button"
              className={[
                'cursor-pointer rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition text-left',
                'border-slate-500/20 bg-slate-800/75 text-slate-200 hover:border-cyan-400/45 hover:bg-cyan-500/18',
                !strictStrokeHitTest
                  ? 'border-cyan-400/70 bg-cyan-400/22 text-cyan-50'
                  : '',
              ].join(' ')}
              onClick={() => {
                setStrictStrokeHitTest(false)
              }}
            >
              fill+stroke hit
            </button>
          </div>
            </section>

            <section className={panelClass}>
          <div className="flex flex-col gap-1">
            <strong className="text-[13px] uppercase tracking-[0.04em] text-slate-50">Commands</strong>
            <span className="text-xs text-slate-200/70">Drive runtime state without product UI</span>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            <button className={controlButtonClass} type="button" onClick={() => dispatch({type: 'viewport.fit'})}>Fit</button>
            <button className={controlButtonClass} type="button" onClick={() => dispatch({type: 'viewport.zoomOut'})}>-</button>
            <button className={controlButtonClass} type="button" onClick={() => dispatch({type: 'viewport.zoomIn'})}>+</button>
            <button className={controlButtonClass} type="button" onClick={() => dispatch({type: 'shape.insert', shape: createRandomShape()})}>Insert</button>
            <button className={controlButtonClass} type="button" onClick={() => dispatch({type: 'history.undo'})}>Undo</button>
            <button className={controlButtonClass} type="button" onClick={() => dispatch({type: 'history.redo'})}>Redo</button>
            <button className={controlButtonClass} type="button" onClick={() => dispatch({type: 'selection.delete'})}>Delete</button>
          </div>
            </section>

            <section className={[panelClass, 'min-h-0 flex-1'].join(' ')}>
          <div className="flex flex-col gap-1">
            <strong className="text-[13px] uppercase tracking-[0.04em] text-slate-50">Runtime</strong>
            <span className="text-xs text-slate-200/70">Lightweight diagnostics for the current scene</span>
          </div>
          <div className="flex flex-wrap gap-2 overflow-auto text-sm text-slate-200/85">
            <span className="rounded-lg bg-slate-800/60 px-2.5 py-1.5"><strong className="mr-1.5 text-[11px] uppercase tracking-[0.08em] text-sky-300">preset</strong> {selection.preset}</span>
            <span className="rounded-lg bg-slate-800/60 px-2.5 py-1.5"><strong className="mr-1.5 text-[11px] uppercase tracking-[0.08em] text-sky-300">backend</strong> {preferredEngineBackend}</span>
            <span className="rounded-lg bg-slate-800/60 px-2.5 py-1.5"><strong className="mr-1.5 text-[11px] uppercase tracking-[0.08em] text-sky-300">hit test</strong> {strictStrokeHitTest ? 'stroke-only' : 'fill+stroke'}</span>
            <span className="rounded-lg bg-slate-800/60 px-2.5 py-1.5"><strong className="mr-1.5 text-[11px] uppercase tracking-[0.08em] text-sky-300">scale</strong> {snapshot.viewport.scale.toFixed(2)}</span>
            <span className="rounded-lg bg-slate-800/60 px-2.5 py-1.5"><strong className="mr-1.5 text-[11px] uppercase tracking-[0.08em] text-sky-300">shapes</strong> {snapshot.stats.shapeCount}</span>
            <span className="rounded-lg bg-slate-800/60 px-2.5 py-1.5"><strong className="mr-1.5 text-[11px] uppercase tracking-[0.08em] text-sky-300">selected</strong> {selectedShape?.name ?? 'none'}</span>
            <span className="rounded-lg bg-slate-800/60 px-2.5 py-1.5"><strong className="mr-1.5 text-[11px] uppercase tracking-[0.08em] text-sky-300">renderer</strong> draw {renderDiagnostics.drawCount} / visible {renderDiagnostics.visibleShapeCount}</span>
            <span className="rounded-lg bg-slate-800/60 px-2.5 py-1.5"><strong className="mr-1.5 text-[11px] uppercase tracking-[0.08em] text-sky-300">draw</strong> {renderDiagnostics.drawMs.toFixed(1)}ms</span>
            <span className="rounded-lg bg-slate-800/60 px-2.5 py-1.5"><strong className="mr-1.5 text-[11px] uppercase tracking-[0.08em] text-sky-300">cache</strong> {renderDiagnostics.cacheHitCount}/{renderDiagnostics.cacheMissCount} {renderDiagnostics.cacheMode}</span>
            <span className="rounded-lg bg-slate-800/60 px-2.5 py-1.5"><strong className="mr-1.5 text-[11px] uppercase tracking-[0.08em] text-sky-300">frame reuse</strong> {renderDiagnostics.frameReuseHitCount}/{renderDiagnostics.frameReuseMissCount}</span>
            <span className="rounded-lg bg-slate-800/60 px-2.5 py-1.5"><strong className="mr-1.5 text-[11px] uppercase tracking-[0.08em] text-sky-300">history</strong> {snapshot.history.cursor + 1}/{snapshot.history.entries.length}</span>
            <span className="rounded-lg bg-slate-800/60 px-2.5 py-1.5"><strong className="mr-1.5 text-[11px] uppercase tracking-[0.08em] text-sky-300">doc</strong> {snapshot.document.width}x{snapshot.document.height}</span>
            <span className="rounded-lg bg-slate-800/60 px-2.5 py-1.5"><strong className="mr-1.5 text-[11px] uppercase tracking-[0.08em] text-sky-300">summary</strong> {formatShapeSummary(snapshot.document)}</span>
          </div>
            </section>
          </div>
        </aside>

        <section className="min-h-0 min-w-0 p-3">
          <div className="grid h-full min-h-0 min-w-0 grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-[24px] border border-slate-700/35 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.1),transparent_35%),linear-gradient(180deg,rgba(15,23,42,0.86),rgba(2,6,23,0.96))] shadow-[0_28px_90px_rgba(2,6,23,0.45)]">
            <div className="border-b border-slate-700/35 px-5 py-3 text-xs text-slate-300/80">
              <span className="font-semibold uppercase tracking-[0.08em] text-cyan-200">Stage</span>
              <span className="ml-2">Viewport + Selection Overlay</span>
            </div>
            <div className="min-h-0 min-w-0">
            <CanvasViewport
              document={snapshot.document}
              renderer={runtimeRenderer}
              overlayRenderer={overlayRenderer}
              shapes={snapshot.shapes}
              stats={snapshot.stats}
              viewport={snapshot.viewport}
              onPointerMove={(pointer) => {
                runtime.postPointer('pointermove', pointer)
              }}
              onPointerDown={(pointer, modifiers) => {
                runtime.postPointer('pointerdown', pointer, modifiers)
              }}
              onPointerUp={() => {}}
              onPointerLeave={() => {
                runtime.clearHover()
              }}
              onViewportChange={runtime.setViewport}
              onViewportPan={runtime.panViewport}
              onViewportResize={runtime.resizeViewport}
              onViewportZoom={runtime.zoomViewport}
              onRenderLodChange={() => {}}
            />
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}

export default App
