import {useEffect} from 'react'
import {Alert, AlertDescription, AlertTitle, Badge, CollapsibleNav, Separator, ThemeMenu, type CollapsibleNavItem} from '@venus/ui'
import {Button as VectorButton, Input as VectorInput, Tabs as VectorTabs, TabsContent as VectorTabsContent, TabsList as VectorTabsList, TabsTrigger as VectorTabsTrigger} from '@venus/ui/vector'
import {Layers3, PackageCheck, ShieldCheck} from 'lucide-react'
import {ComponentDoc, type ComponentDocGroup, type ComponentDocSpec} from './docs/component-doc.tsx'
import {displayDocs} from './docs/display-docs.tsx'
import {feedbackDocs} from './docs/feedback-docs.tsx'
import {formChoiceDocs} from './docs/form-choice-docs.tsx'
import {formControlDocs} from './docs/form-control-docs.tsx'
import {navigationDocs} from './docs/navigation-docs.tsx'
import {overlayDocs} from './docs/overlay-docs.tsx'

function VectorProfileDemo() {
  return <div data-vector-ui-root={'true'} data-theme={'light'} className={'rounded-xl border border-[var(--vector-shell-border)] bg-[var(--vector-shell-surface)] p-5 text-[var(--vector-shell-text)]'}>
    <VectorTabs defaultValue={'appearance'}>
      <VectorTabsList><VectorTabsTrigger value={'appearance'}>Appearance</VectorTabsTrigger><VectorTabsTrigger value={'layout'}>Layout</VectorTabsTrigger></VectorTabsList>
      <VectorTabsContent value={'appearance'} className={'pt-4'}><div className={'flex flex-wrap items-center gap-3'}><VectorInput aria-label={'Opacity'} defaultValue={'100%'}/><VectorButton variant={'primary'} noTooltip>Apply</VectorButton><VectorButton variant={'outline'} noTooltip>Reset</VectorButton></div></VectorTabsContent>
      <VectorTabsContent value={'layout'} className={'pt-4 text-xs'}>Dense vector-editor controls.</VectorTabsContent>
    </VectorTabs>
  </div>
}

const vectorProfileDoc: ComponentDocSpec = {
  id: 'vector-profile',
  title: 'Vector editor profile',
  summary: 'Product-specific dense editor chrome. It is a profile under the same UI package, not a semantic theme.',
  Demo: VectorProfileDemo,
  code: `import '@venus/ui/vector/styles.css'\nimport { Button, Input, Tabs } from '@venus/ui/vector'`,
  api: [
    {api: 'Button / IconButton', contract: 'Vector action props', description: 'Dense editor actions and tooltip policy.'},
    {api: 'Input / InputGroup / Select', contract: 'Vector form contracts', description: 'Dense property controls.'},
    {api: 'DropdownMenu / ContextMenu / Tooltip', contract: 'Base UI behavior parts', description: 'Editor commands and discoverability.'},
    {api: 'Tabs / Modal / Notification', contract: 'Vector workflow contracts', description: 'Panel navigation and feedback.'},
    {api: 'ThemeProvider', contract: 'ThemeMode / ThemePalette', description: 'Vector-profile light and dark token scope.'},
  ],
}

const groups: readonly ComponentDocGroup[] = [
  {id: 'form-controls', title: 'Form controls', items: formControlDocs},
  {id: 'selection-layout', title: 'Selection and form layout', items: formChoiceDocs},
  {id: 'actions-display', title: 'Actions and data display', items: displayDocs},
  {id: 'overlays', title: 'Overlays', items: overlayDocs},
  {id: 'feedback', title: 'Feedback and fallback', items: feedbackDocs},
  {id: 'navigation-theming', title: 'Navigation and theming', items: navigationDocs},
  {id: 'profiles', title: 'Product profiles', items: [vectorProfileDoc]},
]

const navigation: readonly CollapsibleNavItem[] = [
  {id: 'overview-nav', label: 'Overview', items: [{id: 'overview-link', label: 'Venus UI', href: '#overview'}]},
  ...groups.map((group) => ({
    id: `${group.id}-nav`,
    label: group.title,
    items: group.items.map((item) => ({id: `${item.id}-link`, label: item.title, href: `#${item.id}`})),
  })),
]

export function App() {
  useEffect(() => {
    const scrollToHash = () => {
      const id = decodeURIComponent(window.location.hash.slice(1))
      if (!id) return
      window.requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({block: 'start'}))
    }

    scrollToHash()
    window.addEventListener('hashchange', scrollToHash)
    return () => window.removeEventListener('hashchange', scrollToHash)
  }, [])

  return <div className={'min-h-screen bg-background text-foreground'}>
    <header className={'sticky top-0 z-30 border-b bg-background/90 backdrop-blur-xl'}>
      <div className={'mx-auto flex h-16 max-w-[96rem] items-center justify-between gap-4 px-4 sm:px-6'}>
        <a href={'#overview'} className={'flex items-center gap-3 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--state-focus))] focus-visible:ring-offset-2'}>
          <span className={'grid size-9 place-items-center rounded-lg bg-primary text-primary-foreground'}><Layers3 aria-hidden={'true'} data-icon={'inline-start'}/></span>
          <span><span className={'block text-sm font-semibold'}>Venus UI</span><span className={'block text-[11px] text-muted-foreground'}>Component reference</span></span>
        </a>
        <div className={'flex items-center gap-2'}><Badge className={'hidden sm:inline-flex'} variant={'success'}><PackageCheck aria-hidden={'true'} data-icon={'inline-start'}/>single source</Badge><ThemeMenu title={'Change theme'} labels={{classicLight: 'Classic light', classicDark: 'Classic dark', cartoon: 'Cartoon light', cartoonDark: 'Cartoon dark'}}/></div>
      </div>
    </header>

    <div className={'mx-auto grid max-w-[96rem] gap-10 px-4 py-8 sm:px-6 lg:grid-cols-[18rem_minmax(0,1fr)]'}>
      <aside className={'hidden lg:block'}>
        <div className={'sticky top-20 flex max-h-[calc(100vh-6rem)] flex-col gap-4 overflow-y-auto pr-2'} data-ui-scroll>
          <CollapsibleNav ariaLabel={'Component documentation'} items={navigation}/>
          <Separator/>
          <Alert><ShieldCheck aria-hidden={'true'}/><AlertTitle>Public contracts</AlertTitle><AlertDescription>Every navigation item maps to one demo, copyable example, and API table.</AlertDescription></Alert>
        </div>
      </aside>

      <main className={'flex min-w-0 flex-col gap-20'}>
        <section id={'overview'} className={'flex scroll-mt-24 flex-col gap-4'}>
          <div className={'flex flex-col gap-2'}><h1 className={'text-3xl font-semibold tracking-tight'}>Venus UI</h1><p className={'max-w-3xl text-sm leading-6 text-muted-foreground'}>Shared application components, semantic themes, interaction behavior, accessibility fallbacks, and the product-specific vector profile.</p></div>
          <Alert variant={'info'}><AlertTitle>Choose by behavior.</AlertTitle><AlertDescription>Use Select for themed fixed options, NativeSelect for operating-system fallback, and Combobox for searchable options.</AlertDescription></Alert>
          <div className={'lg:hidden'}><CollapsibleNav ariaLabel={'Component documentation'} items={navigation}/></div>
        </section>

        {groups.map((group) => <section key={group.id} id={group.id} className={'flex scroll-mt-24 flex-col gap-14'}>
          <div className={'border-b pb-3'}><h2 className={'text-2xl font-semibold tracking-tight'}>{group.title}</h2></div>
          {group.items.map((spec) => <ComponentDoc key={spec.id} spec={spec}/>) }
        </section>)}
      </main>
    </div>
  </div>
}
