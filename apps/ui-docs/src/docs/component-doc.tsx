import {useId, useLayoutEffect, useRef, useState, type ComponentType} from 'react'
import {Button, Card, CardContent, CardHeader, CardTitle, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, cn} from '@venus/ui'
import {Check, ChevronDown, Copy} from 'lucide-react'

export interface ApiRow {
  api: string
  contract: string
  defaultValue?: string
  description: string
}

export interface ComponentDocSpec {
  id: string
  title: string
  summary: string
  code: string
  api: readonly ApiRow[]
  Demo: ComponentType
}

export interface ComponentDocGroup {
  id: string
  title: string
  items: readonly ComponentDocSpec[]
}

async function copyText(value: string): Promise<void> {
  if (navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(value)
      return
    } catch {
      // Fall through for browsers or embedded contexts that expose but deny Clipboard API access.
    }
  }

  const textarea = document.createElement('textarea')
  textarea.value = value
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.append(textarea)
  textarea.select()
  const copied = document.execCommand('copy')
  textarea.remove()
  if (!copied) throw new Error('Copy is not available in this browser')
}

function CopyButton({value}: {value: string}) {
  const [copied, setCopied] = useState(false)

  return <Button
    aria-label={copied ? 'Code copied' : 'Copy code'}
    size={'sm'}
    variant={'ghost'}
    onClick={async () => {
      try {
        await copyText(value)
        setCopied(true)
        window.setTimeout(() => setCopied(false), 1600)
      } catch {
        setCopied(false)
      }
    }}
  >
    {copied ? <Check aria-hidden={'true'} data-icon={'inline-start'}/> : <Copy aria-hidden={'true'} data-icon={'inline-start'}/>}
    {copied ? 'Copied' : 'Copy'}
  </Button>
}

function ExampleSection({code}: {code: string}) {
  const [open, setOpen] = useState(false)
  const contentId = useId()

  return <Card density={'compact'}>
    <CardHeader className={'flex-row items-center gap-2 p-3'}>
      <button
        type={'button'}
        aria-controls={contentId}
        aria-expanded={open}
        className={'flex min-w-0 flex-1 cursor-[var(--cursor-action)] items-center justify-between gap-3 rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--state-focus))] focus-visible:ring-offset-2'}
        onClick={() => setOpen((current) => !current)}
      >
        <CardTitle>Example</CardTitle>
        <ChevronDown aria-hidden={'true'} data-icon={'inline-end'} className={cn('transition-transform', open && 'rotate-180')}/>
      </button>
      <CopyButton value={code}/>
    </CardHeader>
    {open ? <CardContent id={contentId} className={'p-3 pt-0'}>
      <pre className={'min-w-0 max-w-full overflow-x-auto rounded-md border bg-muted/40 p-3 text-xs leading-5 text-muted-foreground [contain:inline-size]'} data-ui-scroll>
        <code>{code}</code>
      </pre>
    </CardContent> : null}
  </Card>
}

const apiCollapsedHeight = 288

function ApiSection({rows}: {rows: readonly ApiRow[]}) {
  const [expanded, setExpanded] = useState(false)
  const [overflowing, setOverflowing] = useState(false)
  const contentId = useId()
  const contentRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const content = contentRef.current
    if (!content) return

    const updateOverflow = () => setOverflowing(content.scrollHeight > apiCollapsedHeight + 1)
    updateOverflow()
    const observer = new ResizeObserver(updateOverflow)
    observer.observe(content)
    return () => observer.disconnect()
  }, [rows])

  return <div className={'flex flex-col gap-2'}>
    <h4 className={'text-sm font-semibold'}>API</h4>
    <Card density={'compact'}>
      <div className={'relative'}>
        <div
          ref={contentRef}
          id={contentId}
          className={cn('overflow-hidden', overflowing && !expanded && 'max-h-72')}
        >
          <CardContent className={'p-3'}>
            <Table className={'min-w-[44rem]'}>
              <TableHeader><TableRow><TableHead>API</TableHead><TableHead>Contract</TableHead><TableHead>Default</TableHead><TableHead>Use</TableHead></TableRow></TableHeader>
              <TableBody>{rows.map((row) => <TableRow key={row.api}>
                <TableCell className={'font-mono font-medium text-foreground'}>{row.api}</TableCell>
                <TableCell className={'font-mono text-xs'}>{row.contract}</TableCell>
                <TableCell>{row.defaultValue ?? '—'}</TableCell>
                <TableCell>{row.description}</TableCell>
              </TableRow>)}</TableBody>
            </Table>
          </CardContent>
        </div>
        {overflowing && !expanded ? <div className={'pointer-events-none absolute inset-x-0 bottom-0 flex h-24 items-end justify-center rounded-b-lg bg-gradient-to-t from-card via-card/95 to-transparent p-3'}>
          <Button className={'pointer-events-auto'} size={'sm'} variant={'outline'} aria-controls={contentId} aria-expanded={false} onClick={() => setExpanded(true)}>
            Show more
            <ChevronDown aria-hidden={'true'} data-icon={'inline-end'}/>
          </Button>
        </div> : null}
      </div>
      {overflowing && expanded ? <div className={'flex justify-center border-t p-2'}>
        <Button size={'sm'} variant={'ghost'} aria-controls={contentId} aria-expanded={true} onClick={() => setExpanded(false)}>
          Show less
          <ChevronDown aria-hidden={'true'} className={'rotate-180'} data-icon={'inline-end'}/>
        </Button>
      </div> : null}
    </Card>
  </div>
}

export function ComponentDoc({spec}: {spec: ComponentDocSpec}) {
  const {Demo} = spec

  return <article id={spec.id} className={'flex scroll-mt-24 flex-col gap-3'}>
    <div className={'flex min-w-0 flex-col gap-1'}>
      <h3 className={'text-xl font-semibold tracking-tight'}>{spec.title}</h3>
      <p className={'max-w-3xl text-sm text-muted-foreground'}>{spec.summary}</p>
    </div>

    <Card density={'compact'}>
      <CardHeader className={'p-3 pb-2'}>
        <CardTitle>Demo</CardTitle>
      </CardHeader>
      <CardContent className={'p-3 pt-0'}><Demo/></CardContent>
    </Card>

    <ExampleSection code={spec.code}/>
    <ApiSection rows={spec.api}/>
  </article>
}
