import {useState, type ReactNode} from 'react'
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Checkbox,
  CollapsibleNav,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldMessage,
  Input,
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  NumberInput,
  Progress,
  RadioGroup,
  RadioItem,
  Select,
  Separator,
  Skeleton,
  Slider,
  Spinner,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  ThemeMenu,
  WithTooltip,
} from '@venus/ui'
import {
  Button as VectorButton,
  Input as VectorInput,
  Tabs as VectorTabs,
  TabsContent as VectorTabsContent,
  TabsList as VectorTabsList,
  TabsTrigger as VectorTabsTrigger,
} from '@venus/ui/vector'
import {
  CheckCircle2,
  ChevronDown,
  Copy,
  FilePlus2,
  Layers3,
  MoreHorizontal,
  PackageCheck,
  ShieldCheck,
} from 'lucide-react'
import {inputGroupSnippet, installSnippet, tooltipSnippet, uiApiGroups, vectorSnippet} from './catalog.ts'

const navigation = [
  {
    id: 'foundations-nav',
    label: 'Foundations',
    items: [
      {id: 'overview-link', label: 'Overview', href: '#overview'},
      {id: 'themes-link', label: 'Themes', href: '#themes'},
      {id: 'forms-link', label: 'Forms and sizing', href: '#forms'},
      {id: 'interaction-link', label: 'Interaction', href: '#interaction'},
    ],
  },
  {
    id: 'components-nav',
    label: 'Components',
    items: [
      {id: 'actions-link', label: 'Actions', href: '#actions'},
      {id: 'navigation-link', label: 'Navigation and overlays', href: '#navigation'},
      {id: 'feedback-link', label: 'Feedback and fallback', href: '#feedback'},
      {id: 'data-link', label: 'Data display', href: '#data'},
    ],
  },
  {
    id: 'profiles-nav',
    label: 'Profiles',
    items: [{id: 'vector-link', label: 'Vector editor', href: '#vector'}],
  },
  {
    id: 'reference-nav',
    label: 'Reference',
    items: [{id: 'api-link', label: 'Public API', href: '#api'}],
  },
]

const themePreviews = [
  {name: 'Classic light', value: 'classic-light'},
  {name: 'Classic dark', value: 'classic-dark'},
  {name: 'Cartoon light', value: 'cartoon'},
  {name: 'Cartoon dark', value: 'cartoon-dark'},
] as const

function Section({id, title, summary, children}: {id: string; title: string; summary?: string; children: ReactNode}) {
  return <section id={id} className={'flex scroll-mt-20 flex-col gap-4'}>
    <div className={'flex flex-col gap-1'}>
      <h2 className={'text-2xl font-semibold tracking-tight'}>{title}</h2>
      {summary ? <p className={'max-w-3xl text-sm text-muted-foreground'}>{summary}</p> : null}
    </div>
    {children}
  </section>
}

function Showcase({title, description, children, code}: {title: string; description?: string; children: ReactNode; code?: string}) {
  return <Card>
    <CardHeader>
      <CardTitle>{title}</CardTitle>
      {description ? <CardDescription>{description}</CardDescription> : null}
    </CardHeader>
    <CardContent className={'flex flex-col gap-4'}>{children}</CardContent>
    {code ? <CardFooter><CodeLine>{code}</CodeLine></CardFooter> : null}
  </Card>
}

function CodeLine({children}: {children: string}) {
  return <pre className={'w-full min-w-0 max-w-full overflow-x-auto rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground [contain:inline-size]'} data-ui-scroll>
    <code>{children}</code>
  </pre>
}

function ThemePreview({name, value}: {name: string; value: string}) {
  return <Card data-theme={value} className={'bg-background text-foreground'}>
    <CardHeader className={'flex-row items-center justify-between'}>
      <CardTitle>{name}</CardTitle>
      <Badge variant={'outline'}>{value.endsWith('dark') ? 'dark' : 'light'}</Badge>
    </CardHeader>
    <CardContent className={'flex flex-col gap-3'}>
      <Input aria-label={`${name} sample input`} defaultValue={'Semantic tokens'}/>
      <div className={'flex flex-wrap gap-2'}>
        <Button size={'sm'}>Primary</Button>
        <Button size={'sm'} variant={'outline'}>Outline</Button>
        <Badge variant={'success'}>Ready</Badge>
      </div>
    </CardContent>
  </Card>
}

export function App() {
  const [checked, setChecked] = useState(true)
  const [offlineSync, setOfflineSync] = useState(false)
  const [density, setDensity] = useState('comfortable')
  const [zoom, setZoom] = useState(72)

  return <div className={'min-h-screen bg-background text-foreground'}>
    <header className={'sticky top-0 z-30 border-b bg-background/90 backdrop-blur-xl'}>
      <div className={'mx-auto flex h-16 max-w-[96rem] items-center justify-between gap-4 px-4 sm:px-6'}>
        <a href={'#overview'} className={'flex items-center gap-3 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--state-focus))] focus-visible:ring-offset-2'}>
          <span className={'grid size-9 place-items-center rounded-lg bg-primary text-primary-foreground'}><Layers3 aria-hidden={'true'} data-icon={'inline-start'}/></span>
          <span>
            <span className={'block text-sm font-semibold'}>Venus UI</span>
            <span className={'block text-[11px] text-muted-foreground'}>Design system</span>
          </span>
        </a>
        <div className={'flex items-center gap-2'}>
          <Badge className={'hidden sm:inline-flex'} variant={'success'}><PackageCheck aria-hidden={'true'} data-icon={'inline-start'}/>single source</Badge>
          <ThemeMenu
            title={'Change theme'}
            labels={{classicLight: 'Classic light', classicDark: 'Classic dark', cartoon: 'Cartoon light', cartoonDark: 'Cartoon dark'}}
          />
        </div>
      </div>
    </header>

    <div className={'mx-auto grid max-w-[96rem] gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[15rem_minmax(0,1fr)]'}>
      <aside className={'hidden lg:block'}>
        <div className={'sticky top-24 flex flex-col gap-4'}>
          <CollapsibleNav ariaLabel={'UI documentation'} items={navigation}/>
          <Separator/>
          <Alert>
            <AlertTitle>One component owner</AlertTitle>
            <AlertDescription>Apps consume public entries from packages/ui.</AlertDescription>
          </Alert>
        </div>
      </aside>

      <main className={'flex min-w-0 flex-col gap-16'}>
        <Section id={'overview'} title={'Venus UI'} summary={'Shared application components, semantic themes, interaction rules, and product-specific profiles.'}>
          <div className={'grid gap-4 md:grid-cols-2'}>
            <Showcase title={'App-neutral entry'} description={'Use for product shells, forms, feedback, and content.'} code={installSnippet}>
              <Badge variant={'success'}>preferred</Badge>
            </Showcase>
            <Showcase title={'Vector editor profile'} description={'Use only for dense vector-editor chrome and compatibility APIs.'} code={vectorSnippet}>
              <Badge variant={'outline'}>product-specific</Badge>
            </Showcase>
          </div>
        </Section>

        <Section id={'themes'} title={'Themes'} summary={'A theme is a semantic token family. Each built-in family supports both light and dark appearances.'}>
          <div className={'grid gap-4 sm:grid-cols-2 xl:grid-cols-4'}>
            {themePreviews.map((theme) => <ThemePreview key={theme.value} {...theme}/>)}
          </div>
          <Alert variant={'info'}>
            <AlertTitle>Vector is a profile, not a theme.</AlertTitle>
            <AlertDescription>It changes density, component contracts, and editor semantics. Theme selection changes semantic color tokens only.</AlertDescription>
          </Alert>
        </Section>

        <Section id={'forms'} title={'Forms and sizing'} summary={'Controls share sm, md, and lg sizes. Field groups become multi-column only when space permits.'}>
          <div className={'grid gap-4 xl:grid-cols-2'}>
            <Showcase title={'Composed inputs'} description={'Use one visual group when the action or affordance belongs to the value.'} code={inputGroupSnippet}>
              <Field>
                <FieldLabel htmlFor={'asset-search'}>Asset search</FieldLabel>
                <InputGroup>
                  <InputGroupInput id={'asset-search'} placeholder={'Search local assets'}/>
                  <InputGroupAddon align={'inline-end'}>
                    <WithTooltip content={'Run search'}>
                      <InputGroupButton size={'sm'}>Search</InputGroupButton>
                    </WithTooltip>
                  </InputGroupAddon>
                </InputGroup>
              </Field>
              <Field>
                <FieldLabel htmlFor={'preset'}>Preset</FieldLabel>
                <InputGroup>
                  <InputGroupInput id={'preset'} readOnly value={'Web · 1440 × 900'}/>
                  <InputGroupAddon align={'inline-end'}>
                    <WithTooltip content={'Choose preset'}>
                      <InputGroupButton aria-label={'Choose preset'}><ChevronDown aria-hidden={'true'} data-icon={'inline-start'}/></InputGroupButton>
                    </WithTooltip>
                  </InputGroupAddon>
                </InputGroup>
              </Field>
              <Field>
                <FieldLabel htmlFor={'copies'}>Copies</FieldLabel>
                <NumberInput defaultValue={2} min={1} max={99} inputProps={{id: 'copies'}} decrementTooltip={'Decrease copies'} incrementTooltip={'Increase copies'}/>
              </Field>
            </Showcase>

            <Showcase title={'Size scale'}>
              <FieldGroup columns={3}>
                <Field><FieldLabel htmlFor={'size-sm'}>Small · 28 px</FieldLabel><Input id={'size-sm'} controlSize={'sm'} defaultValue={'Dense'}/></Field>
                <Field><FieldLabel htmlFor={'size-md'}>Medium · 32 px</FieldLabel><Input id={'size-md'} controlSize={'md'} defaultValue={'Default'}/></Field>
                <Field><FieldLabel htmlFor={'size-lg'}>Large · 40 px</FieldLabel><Input id={'size-lg'} controlSize={'lg'} defaultValue={'Prominent'}/></Field>
              </FieldGroup>
              <Table>
                <TableHeader><TableRow><TableHead>Size</TableHead><TableHead>Use</TableHead><TableHead>Touch</TableHead></TableRow></TableHeader>
                <TableBody>
                  <TableRow><TableCell>sm</TableCell><TableCell>Dense tools</TableCell><TableCell rowSpan={3}>At least 44 px on coarse pointers</TableCell></TableRow>
                  <TableRow><TableCell>md</TableCell><TableCell>Default forms</TableCell></TableRow>
                  <TableRow><TableCell>lg</TableCell><TableCell>Prominent entry</TableCell></TableRow>
                </TableBody>
              </Table>
            </Showcase>

            <Showcase title={'Field states'} description={'Validation belongs to the field. It propagates visual state, disabled state, and error semantics to its controls.'}>
              <FieldGroup columns={2}>
                <Field>
                  <FieldLabel htmlFor={'state-default'}>Default</FieldLabel>
                  <Input id={'state-default'} defaultValue={'Ready to edit'}/>
                  <FieldDescription>Use helper text only when needed.</FieldDescription>
                </Field>
                <Field validation={'success'}>
                  <FieldLabel htmlFor={'state-success'}>Success</FieldLabel>
                  <Input id={'state-success'} defaultValue={'venus.local'}/>
                  <FieldMessage>Available.</FieldMessage>
                </Field>
                <Field validation={'warning'}>
                  <FieldLabel htmlFor={'state-warning'}>Warning</FieldLabel>
                  <Input id={'state-warning'} defaultValue={'Large local file'}/>
                  <FieldMessage>May take longer to open.</FieldMessage>
                </Field>
                <Field validation={'error'}>
                  <FieldLabel htmlFor={'state-error'}>Error</FieldLabel>
                  <Input id={'state-error'} defaultValue={'invalid/name'}/>
                  <FieldMessage>Use letters, numbers, spaces, or dashes.</FieldMessage>
                </Field>
                <Field disabled>
                  <FieldLabel htmlFor={'state-disabled'}>Disabled</FieldLabel>
                  <Input id={'state-disabled'} defaultValue={'Managed by workspace'}/>
                  <FieldMessage>Unavailable in offline mode.</FieldMessage>
                </Field>
              </FieldGroup>
            </Showcase>

            <Showcase title={'Responsive form'} description={'Two-column groups collapse below the md breakpoint; responsive fields move labels above controls on small screens.'}>
              <FieldGroup columns={2}>
                <Field orientation={'responsive'}>
                  <FieldLabel htmlFor={'project-name'}>Project</FieldLabel>
                  <FieldContent><Input id={'project-name'} defaultValue={'Venus'}/><FieldDescription>Stored locally by default.</FieldDescription></FieldContent>
                </Field>
                <Field orientation={'responsive'}>
                  <FieldLabel htmlFor={'runtime'}>Runtime</FieldLabel>
                  <FieldContent><Select id={'runtime'} defaultValue={'browser'}><option value={'browser'}>Browser</option><option value={'server'}>Server</option></Select></FieldContent>
                </Field>
              </FieldGroup>
              <Field><FieldLabel htmlFor={'notes'}>Notes</FieldLabel><Textarea id={'notes'} placeholder={'Optional implementation notes'}/></Field>
            </Showcase>

            <Showcase title={'Selection controls'}>
              <div className={'flex flex-wrap items-center gap-5'}>
                <label className={'flex min-h-6 items-center gap-2 text-sm'}><Checkbox checked={checked} onChange={(event) => setChecked(event.target.checked)}/>Enable previews</label>
                <label className={'flex min-h-6 items-center gap-2 text-sm'} htmlFor={'offline-sync'}>Sync when online<Switch id={'offline-sync'} checked={offlineSync} onCheckedChange={setOfflineSync}/></label>
              </div>
              <RadioGroup label={'Density'} orientation={'horizontal'} value={density} onValueChange={setDensity}>
                <RadioItem value={'compact'} label={'Compact'}/><RadioItem value={'comfortable'} label={'Comfortable'}/>
              </RadioGroup>
              <Slider label={'Preview scale'} showValue value={zoom} min={25} max={100} onValueChange={setZoom}/>
            </Showcase>
          </div>
        </Section>

        <Section id={'interaction'} title={'Interaction'} summary={'Public interactive components support pointer, keyboard, focus, disabled, invalid, and fallback states.'}>
          <Showcase title={'Tooltip contract'} description={'Wrap the real trigger with WithTooltip. The trigger keeps its accessible name; the tooltip supplies optional supplementary help.'} code={tooltipSnippet}>
            <div className={'flex flex-wrap items-center gap-2'}>
              <WithTooltip content={'Duplicate selection'}><Button aria-label={'Duplicate selection'} size={'icon'} variant={'outline'}><Copy aria-hidden={'true'} data-icon={'inline-start'}/></Button></WithTooltip>
              <WithTooltip content={'More actions'}><Button aria-label={'More actions'} size={'icon'} variant={'ghost'}><MoreHorizontal aria-hidden={'true'} data-icon={'inline-start'}/></Button></WithTooltip>
              <Button disabled>Unavailable</Button>
            </div>
          </Showcase>
          <Card>
            <CardContent className={'pt-4'}>
              <Table>
                <TableHeader><TableRow><TableHead>Concern</TableHead><TableHead>Library contract</TableHead><TableHead>Reference</TableHead></TableRow></TableHeader>
                <TableBody>
                  <TableRow><TableCell>Pointer and touch</TableCell><TableCell>Hover is supplemental; coarse pointers receive 44 px targets.</TableCell><TableCell><a className={'text-primary underline underline-offset-4'} href={'https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum'} target={'_blank'} rel={'noreferrer'}>WCAG 2.2</a></TableCell></TableRow>
                  <TableRow><TableCell>Keyboard and focus</TableCell><TableCell>Every action has visible focus and standard composite-widget keys.</TableCell><TableCell><a className={'text-primary underline underline-offset-4'} href={'https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/'} target={'_blank'} rel={'noreferrer'}>ARIA APG</a></TableCell></TableRow>
                  <TableRow><TableCell>Preferences</TableCell><TableCell>Reduced motion, increased contrast, and forced colors have CSS fallbacks.</TableCell><TableCell><a className={'text-primary underline underline-offset-4'} href={'https://www.w3.org/WAI/WCAG22/Techniques/css/C39'} target={'_blank'} rel={'noreferrer'}>WCAG C39</a></TableCell></TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </Section>

        <Section id={'actions'} title={'Actions'}>
          <Showcase title={'Button variants'}>
            <div className={'flex flex-wrap gap-2'}>
              <Button>Primary</Button><Button variant={'secondary'}>Secondary</Button><Button variant={'outline'}>Outline</Button><Button variant={'ghost'}>Ghost</Button><Button variant={'destructive'}>Delete</Button>
            </div>
          </Showcase>
        </Section>

        <Section id={'navigation'} title={'Navigation and overlays'}>
          <Showcase title={'Tabs and dialog'}>
            <Tabs defaultValue={'preview'}>
              <TabsList aria-label={'Asset view'}><TabsTrigger value={'preview'}>Preview</TabsTrigger><TabsTrigger value={'details'}>Details</TabsTrigger></TabsList>
              <TabsContent value={'preview'}>Canvas preview is ready.</TabsContent>
              <TabsContent value={'details'}>1280 × 720 · local document</TabsContent>
            </Tabs>
            <Dialog>
              <DialogTrigger render={<Button variant={'outline'}/>}>Open dialog</DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Publish local build?</DialogTitle><DialogDescription>The offline document stays on this device until sync is enabled.</DialogDescription></DialogHeader>
                <DialogFooter><DialogClose render={<Button variant={'outline'}/>}>Cancel</DialogClose><DialogClose render={<Button/>}>Publish</DialogClose></DialogFooter>
              </DialogContent>
            </Dialog>
          </Showcase>
        </Section>

        <Section id={'feedback'} title={'Feedback and fallback'}>
          <div className={'grid gap-4 xl:grid-cols-2'}>
            <Showcase title={'Status and loading'}>
              <Alert variant={'success'}><CheckCircle2 aria-hidden={'true'}/><AlertTitle>Saved locally</AlertTitle><AlertDescription>Cloud availability does not affect this document.</AlertDescription></Alert>
              <div className={'flex items-center gap-3'}><Avatar><AvatarImage src={'/missing-avatar.png'} alt={'Ada Lovelace'}/><AvatarFallback>AL</AvatarFallback></Avatar><div className={'flex flex-1 flex-col gap-2'}><Skeleton className={'h-3 w-2/3'}/><Skeleton className={'h-3 w-1/2'}/></div><Spinner label={'Loading profile'}/></div>
              <Progress label={'Upload progress'} showLabel showValue value={68}/>
            </Showcase>
            <Showcase title={'Empty state'}>
              <Empty>
                <EmptyHeader><EmptyMedia><FilePlus2 aria-hidden={'true'} data-icon={'inline-start'}/></EmptyMedia><EmptyTitle>No local documents</EmptyTitle><EmptyDescription>Create a document now; enable sync later.</EmptyDescription></EmptyHeader>
                <EmptyContent><Button size={'sm'}>Create document</Button></EmptyContent>
              </Empty>
            </Showcase>
          </div>
        </Section>

        <Section id={'data'} title={'Data display'}>
          <Showcase title={'Semantic table'}>
            <Table>
              <TableHeader><TableRow><TableHead>Document</TableHead><TableHead>Storage</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody><TableRow><TableCell>Landing page</TableCell><TableCell>Local</TableCell><TableCell><Badge variant={'success'}>Ready</Badge></TableCell></TableRow></TableBody>
            </Table>
          </Showcase>
        </Section>

        <Section id={'vector'} title={'Vector editor profile'} summary={'A product-specific component profile for dense editor chrome. It remains owned by packages/ui and carries its own light/dark provider.'}>
          <div data-vector-ui-root={'true'} data-theme={'light'} className={'rounded-xl border border-[var(--vector-shell-border)] bg-[var(--vector-shell-surface)] p-5 text-[var(--vector-shell-text)]'}>
            <div className={'mb-5 flex items-start justify-between gap-4'}>
              <div><h3 className={'vector-editor-text-heading'}>Dense controls</h3><p className={'vector-shell-text-muted mt-1'}>For property panels and editor commands.</p></div>
              <Badge variant={'outline'}>profile</Badge>
            </div>
            <VectorTabs defaultValue={'appearance'}>
              <VectorTabsList><VectorTabsTrigger value={'appearance'}>Appearance</VectorTabsTrigger><VectorTabsTrigger value={'layout'}>Layout</VectorTabsTrigger></VectorTabsList>
              <VectorTabsContent value={'appearance'} className={'pt-4'}>
                <div className={'flex flex-wrap items-center gap-3'}><VectorInput aria-label={'Opacity'} defaultValue={'100%'}/><VectorButton variant={'primary'} noTooltip>Apply</VectorButton><VectorButton variant={'outline'} noTooltip>Reset</VectorButton></div>
              </VectorTabsContent>
              <VectorTabsContent value={'layout'} className={'pt-4 text-xs'}>Layout controls share the vector token scope.</VectorTabsContent>
            </VectorTabs>
          </div>
        </Section>

        <Section id={'api'} title={'Public API'}>
          <div className={'flex flex-col gap-6'}>
            {uiApiGroups.map((group) => <Card key={group.entry}>
              <CardHeader className={'flex-row items-start justify-between gap-4'}>
                <div><CardTitle>{group.title}</CardTitle><CardDescription>{group.entry}</CardDescription></div>
                <Badge variant={group.status === 'preferred' ? 'success' : 'outline'}>{group.status}</Badge>
              </CardHeader>
              <CardContent>
                <Table className={'min-w-[38rem]'}>
                  <TableHeader><TableRow><TableHead>Export</TableHead><TableHead>Contract</TableHead><TableHead>Use</TableHead></TableRow></TableHeader>
                  <TableBody>{group.items.map((item) => <TableRow key={item.name}><TableCell className={'font-mono font-medium text-foreground'}>{item.name}</TableCell><TableCell>{item.contract}</TableCell><TableCell>{item.purpose}</TableCell></TableRow>)}</TableBody>
                </Table>
              </CardContent>
            </Card>)}
          </div>
          <Alert variant={'info'}><ShieldCheck aria-hidden={'true'}/><AlertTitle>Source of truth</AlertTitle><AlertDescription>Exported TypeScript contracts in packages/ui/src. UI Docs demonstrates those public entries without local component copies.</AlertDescription></Alert>
        </Section>
      </main>
    </div>
  </div>
}
