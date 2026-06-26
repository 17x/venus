import {useEffect, useRef, useState} from 'react'
import {Button} from './components/ui/button.tsx'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from './components/ui/card.tsx'
import {engineApiCategories, type EngineApiCategory, type EngineApiDoc} from './engineApiDocs.ts'

type ThemeMode = 'light' | 'dark'

const getApiAnchorId = (category: EngineApiCategory, api: EngineApiDoc) => {
  return `${category.id}-${api.id}`
}

const quickStartSnippet = `import {createEngine} from '@venus/engine'

const canvas = document.querySelector('canvas')!
const engine = createEngine({canvas, initialScene})

await engine.renderFrame()`

const drawLabel = (context: CanvasRenderingContext2D, text: string, x: number, y: number, theme: ThemeMode) => {
  context.fillStyle = theme === 'light' ? '#334155' : '#cbd5e1'
  context.font = '12px ui-sans-serif, system-ui'
  context.fillText(text, x, y)
}

const drawDemo = (context: CanvasRenderingContext2D, apiId: string, theme: ThemeMode) => {
  const canvas = context.canvas
  const isLight = theme === 'light'
  context.clearRect(0, 0, canvas.width, canvas.height)
  context.fillStyle = isLight ? '#f8fafc' : '#020617'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.strokeStyle = isLight ? '#cbd5e1' : '#334155'
  context.lineWidth = 1
  context.strokeRect(0.5, 0.5, canvas.width - 1, canvas.height - 1)

  if (apiId === 'create-engine') {
    context.fillStyle = isLight ? '#dbeafe' : '#1e3a8a'
    context.fillRect(36, 42, 188, 112)
    context.strokeStyle = isLight ? '#2563eb' : '#93c5fd'
    context.lineWidth = 3
    context.strokeRect(36, 42, 188, 112)
    drawLabel(context, 'canvas + initialScene', 54, 98, theme)
    drawLabel(context, 'engine.renderFrame()', 64, 176, theme)
    return
  }

  if (apiId === 'engine-options') {
    const rows = ['canvas', 'initialScene', 'render', 'culling', 'lod']
    rows.forEach((row, index) => {
      const y = 34 + index * 30
      context.fillStyle = index === 0 ? (isLight ? '#dcfce7' : '#14532d') : (isLight ? '#f1f5f9' : '#1e293b')
      context.fillRect(38, y, 184, 22)
      drawLabel(context, row, 50, y + 15, theme)
    })
    drawLabel(context, 'EngineCreateOptions', 54, 206, theme)
    return
  }

  if (apiId === 'render-frame') {
    context.fillStyle = isLight ? '#eef2ff' : '#312e81'
    context.fillRect(52, 40, 160, 100)
    context.strokeStyle = isLight ? '#4f46e5' : '#a5b4fc'
    context.lineWidth = 4
    context.strokeRect(52, 40, 160, 100)
    context.beginPath()
    context.moveTo(42, 170)
    context.lineTo(210, 170)
    context.stroke()
    drawLabel(context, 'scene → backend → pixels', 58, 200, theme)
    return
  }

  if (apiId === 'rect') {
    context.fillStyle = isLight ? '#ccfbf1' : '#134e4a'
    context.strokeStyle = isLight ? '#0f766e' : '#5eead4'
    context.lineWidth = 4
    context.roundRect(44, 48, 176, 104, 18)
    context.fill()
    context.stroke()
    drawLabel(context, 'rounded rect', 90, 180, theme)
    return
  }

  if (apiId === 'ellipse') {
    context.fillStyle = isLight ? '#fed7aa' : '#7c2d12'
    context.strokeStyle = isLight ? '#ea580c' : '#fdba74'
    context.lineWidth = 4
    context.beginPath()
    context.ellipse(132, 100, 82, 54, 0, 0, Math.PI * 2)
    context.fill()
    context.stroke()
    drawLabel(context, 'ellipse bounds', 86, 180, theme)
    return
  }

  if (apiId === 'line') {
    context.strokeStyle = isLight ? '#475569' : '#e2e8f0'
    context.lineWidth = 10
    context.lineCap = 'round'
    context.beginPath()
    context.moveTo(42, 66)
    context.lineTo(218, 150)
    context.stroke()
    drawLabel(context, 'stroke hit area', 82, 190, theme)
    return
  }

  if (apiId === 'text') {
    context.fillStyle = isLight ? '#0f172a' : '#f8fafc'
    context.font = '700 24px ui-sans-serif, system-ui'
    context.fillText('Engine Text', 48, 104)
    context.strokeStyle = isLight ? '#cbd5e1' : '#475569'
    context.setLineDash([6, 5])
    context.strokeRect(44, 74, 170, 40)
    context.setLineDash([])
    drawLabel(context, 'measured text bounds', 72, 166, theme)
    return
  }

  if (apiId === 'hover-hit' || apiId === 'clicked-hit') {
    context.fillStyle = isLight ? '#e0f2fe' : '#0c4a6e'
    context.fillRect(52, 52, 152, 96)
    context.strokeStyle = apiId === 'hover-hit' ? '#0ea5e9' : '#22c55e'
    context.lineWidth = 4
    context.strokeRect(52, 52, 152, 96)
    context.beginPath()
    context.arc(150, 96, 7, 0, Math.PI * 2)
    context.fillStyle = apiId === 'hover-hit' ? '#0ea5e9' : '#22c55e'
    context.fill()
    drawLabel(context, apiId === 'hover-hit' ? 'hover target' : 'clicked target', 78, 184, theme)
    return
  }

  if (apiId === 'bounds-cache') {
    context.fillStyle = isLight ? '#fef3c7' : '#78350f'
    context.fillRect(70, 54, 120, 90)
    context.strokeStyle = isLight ? '#f59e0b' : '#fbbf24'
    context.lineWidth = 3
    context.strokeRect(70, 54, 120, 90)
    context.setLineDash([5, 4])
    context.strokeStyle = isLight ? '#64748b' : '#cbd5e1'
    context.strokeRect(58, 42, 144, 114)
    context.setLineDash([])
    drawLabel(context, 'cached world bounds', 64, 188, theme)
    return
  }

  context.strokeStyle = isLight ? '#6366f1' : '#a5b4fc'
  context.lineWidth = 2
  context.strokeRect(70, 48, 120, 90)
  context.fillStyle = isLight ? '#4f46e5' : '#818cf8'
  context.beginPath()
  context.arc(130, 94, 6, 0, Math.PI * 2)
  context.fill()
  drawLabel(context, 'world ↔ screen', 78, 184, theme)
}

function ApiCanvasDemo({api, theme}: {api: EngineApiDoc, theme: ThemeMode}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }

    const scale = window.devicePixelRatio || 1
    canvas.width = Math.round(260 * scale)
    canvas.height = Math.round(220 * scale)
    canvas.style.width = '260px'
    canvas.style.height = '220px'
    const context = canvas.getContext('2d')
    if (!context) {
      return
    }

    context.setTransform(scale, 0, 0, scale, 0, 0)
    drawDemo(context, api.id, theme)
  }, [api.id, theme])

  return <canvas ref={canvasRef} aria-label={`${api.title} visual demo`} className={'rounded-lg border bg-card shadow-sm'} />
}

export function App() {
  const [theme, setTheme] = useState<ThemeMode>('light')

  const toggleTheme = () => {
    setTheme((currentTheme) => currentTheme === 'light' ? 'dark' : 'light')
  }

  return <div data-theme={theme} className={'min-h-screen bg-background text-foreground'}>
    <header className={'sticky top-0 border-b bg-background/95 backdrop-blur'}>
      <div className={'mx-auto flex h-14 max-w-screen-2xl items-center justify-between gap-4 px-6'}>
        <a href={'#top'} className={'text-sm font-semibold tracking-tight'}>Venus Engine Docs</a>
        <div className={'flex items-center gap-2'}>
          <nav className={'hidden items-center gap-1 md:flex'} aria-label={'Primary'}>
            {engineApiCategories.map((category) => {
              return <a
                key={category.id}
                href={`#${category.id}`}
                className={'rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground'}
              >
                {category.title}
              </a>
            })}
          </nav>
          <Button variant={'outline'} size={'sm'} onClick={toggleTheme}>
            {theme === 'light' ? 'Dark' : 'Light'}
          </Button>
        </div>
      </div>
    </header>

    <div id={'top'} className={'mx-auto grid max-w-screen-2xl gap-8 px-6 py-8 lg:grid-cols-[300px_minmax(0,1fr)]'}>
      <aside className={'hidden lg:block'}>
        <div className={'sticky top-20 flex max-h-[calc(100vh-6rem)] flex-col gap-6 overflow-auto pr-4'}>
          <div className={'flex flex-col gap-2'}>
            <p className={'text-xs font-medium uppercase tracking-wide text-muted-foreground'}>Documentation</p>
            <h1 className={'text-2xl font-semibold tracking-tight'}>Engine API</h1>
            <p className={'text-sm leading-6 text-muted-foreground'}>
              Read this as a product guide: start with initialization, then document objects, methods, hit testing, and geometry cache behavior.
            </p>
          </div>

          <nav className={'flex flex-col gap-5'} aria-label={'Engine API navigation'}>
            {engineApiCategories.map((category) => {
              return <div key={category.id} className={'flex flex-col gap-2'}>
                <a href={`#${category.id}`} className={'text-sm font-medium'}>{category.title}</a>
                <p className={'text-xs leading-5 text-muted-foreground'}>{category.summary}</p>
                <div className={'flex flex-col gap-1 border-l pl-3'}>
                  {category.apis.map((api) => {
                    return <a
                      key={api.id}
                      href={`#${getApiAnchorId(category, api)}`}
                      className={'text-sm leading-6 text-muted-foreground transition-colors hover:text-foreground'}
                    >
                      {api.title}
                    </a>
                  })}
                </div>
              </div>
            })}
          </nav>
        </div>
      </aside>

      <main className={'min-w-0'}>
        <section className={'mb-12 flex flex-col gap-6'}>
          <div className={'flex flex-col gap-3'}>
            <p className={'text-sm font-medium text-muted-foreground'}>Engine documentation</p>
            <h2 className={'text-4xl font-semibold tracking-tight'}>A readable API guide with live canvas previews.</h2>
            <p className={'max-w-3xl text-base leading-7 text-muted-foreground'}>
              Each section explains what a user can do, which properties matter, and shows the corresponding rendering or interaction behavior on canvas.
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Quick start</CardTitle>
              <CardDescription>Default flow: prepare a canvas, create an engine instance, load a scene, then render.</CardDescription>
            </CardHeader>
            <CardContent className={'grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]'}>
              <pre className={'overflow-auto rounded-lg bg-muted p-4 text-xs leading-6 text-muted-foreground'}><code>{quickStartSnippet}</code></pre>
              <ApiCanvasDemo api={engineApiCategories[0].apis[0]} theme={theme}/>
            </CardContent>
          </Card>
        </section>

        <div className={'flex flex-col gap-14'}>
          {engineApiCategories.map((category) => {
            return <section key={category.id} id={category.id} className={'scroll-mt-20'}>
              <div className={'mb-6 flex flex-col gap-2 border-b pb-5'}>
                <p className={'text-sm font-medium text-muted-foreground'}>{category.apis.length} APIs</p>
                <h2 className={'text-3xl font-semibold tracking-tight'}>{category.title}</h2>
                <p className={'max-w-3xl text-sm leading-6 text-muted-foreground'}>{category.summary}</p>
              </div>

              <div className={'flex flex-col gap-8'}>
                {category.apis.map((api) => {
                  return <article key={api.id} id={getApiAnchorId(category, api)} className={'scroll-mt-20'}>
                    <Card>
                      <CardHeader>
                        <CardTitle>{api.title}</CardTitle>
                        <CardDescription>{api.summary}</CardDescription>
                      </CardHeader>
                      <CardContent className={'grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]'}>
                        <div className={'flex min-w-0 flex-col gap-5'}>
                          <section className={'flex flex-col gap-2'}>
                            <h3 className={'text-sm font-medium'}>How to read it</h3>
                            <p className={'text-sm leading-6 text-muted-foreground'}>{api.readableDescription}</p>
                          </section>

                          <section className={'flex flex-col gap-2'}>
                            <h3 className={'text-sm font-medium'}>Signature</h3>
                            <pre className={'overflow-auto rounded-lg bg-muted p-4 text-xs text-muted-foreground'}><code>{api.signature}</code></pre>
                          </section>

                          <section className={'flex flex-col gap-2'}>
                            <h3 className={'text-sm font-medium'}>Properties</h3>
                            <ul className={'grid gap-2 text-sm text-muted-foreground md:grid-cols-2'}>
                              {api.properties.map((property) => {
                                return <li key={property} className={'rounded-md border bg-card px-3 py-2 text-xs'}>{property}</li>
                              })}
                            </ul>
                          </section>

                          <section className={'flex flex-col gap-2'}>
                            <h3 className={'text-sm font-medium'}>Usage</h3>
                            <pre className={'overflow-auto rounded-lg bg-muted p-4 text-xs leading-6 text-muted-foreground'}><code>{api.demo}</code></pre>
                          </section>
                        </div>

                        <div className={'flex flex-col gap-3'}>
                          <h3 className={'text-sm font-medium'}>Canvas demo</h3>
                          <ApiCanvasDemo api={api} theme={theme}/>
                          <p className={'text-xs leading-5 text-muted-foreground'}>{api.demoCaption}</p>
                        </div>
                      </CardContent>
                    </Card>
                  </article>
                })}
              </div>
            </section>
          })}
        </div>
      </main>
    </div>
  </div>
}
