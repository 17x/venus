import {
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
  Separator,
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
} from '@venus/ui'
import type {ComponentDocSpec} from './component-doc.tsx'

function ButtonDemo() {
  return <div className={'flex flex-wrap gap-2'}><Button>Primary</Button><Button variant={'secondary'}>Secondary</Button><Button variant={'outline'}>Outline</Button><Button variant={'ghost'}>Ghost</Button><Button variant={'destructive'}>Delete</Button></div>
}

function CardDemo() {
  return <Card className={'max-w-md'}><CardHeader><CardTitle>Local document</CardTitle><CardDescription>Available without network access.</CardDescription></CardHeader><CardContent>Last saved just now.</CardContent><CardFooter><Button size={'sm'}>Open</Button></CardFooter></Card>
}

function BadgeDemo() {
  return <div className={'flex flex-wrap gap-2'}><Badge>Default</Badge><Badge variant={'outline'}>Outline</Badge><Badge variant={'success'}>Ready</Badge><Badge variant={'warning'}>Warning</Badge><Badge variant={'destructive'}>Failed</Badge></div>
}

function AvatarDemo() {
  return <div className={'flex items-center gap-3'}><Avatar><AvatarImage src={'/missing-avatar.png'} alt={'Ada Lovelace'}/><AvatarFallback>AL</AvatarFallback></Avatar><span className={'text-sm'}>Ada Lovelace</span></div>
}

function TableDemo() {
  return <Table><TableHeader><TableRow><TableHead>Document</TableHead><TableHead>Storage</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody><TableRow><TableCell>Landing page</TableCell><TableCell>Local</TableCell><TableCell><Badge variant={'success'}>Ready</Badge></TableCell></TableRow></TableBody></Table>
}

function TabsDemo() {
  return <Tabs defaultValue={'preview'}><TabsList aria-label={'Asset view'}><TabsTrigger value={'preview'}>Preview</TabsTrigger><TabsTrigger value={'details'}>Details</TabsTrigger></TabsList><TabsContent value={'preview'}>Canvas preview is ready.</TabsContent><TabsContent value={'details'}>1280 × 720 · local document</TabsContent></Tabs>
}

function SeparatorDemo() {
  return <div className={'flex items-center gap-4 text-sm'}><span>Local</span><Separator orientation={'vertical'} className={'h-6'}/><span>Offline ready</span></div>
}

export const displayDocs: readonly ComponentDocSpec[] = [
  {
    id: 'button', title: 'Button', summary: 'Primary action primitive with semantic variants, size scale, disabled, pressed, expanded, and invalid states.', Demo: ButtonDemo,
    code: `<Button>Primary</Button>\n<Button variant="outline">Outline</Button>\n<Button variant="destructive">Delete</Button>`,
    api: [
      {api: 'Button', contract: 'ButtonProps', description: 'Forwards native button attributes and ref.'},
      {api: 'variant', contract: 'default | secondary | ghost | outline | destructive | link', defaultValue: 'default', description: 'Semantic action hierarchy.'},
      {api: 'size', contract: 'default | xs | sm | lg | icon | icon-xs | icon-sm | icon-lg', defaultValue: 'default', description: 'Text or icon control scale.'},
      {api: 'asChild', contract: 'boolean', defaultValue: 'false', description: 'Compatibility composition for an existing child element.'},
      {api: 'buttonVariants', contract: 'CVA function', description: 'Shared variant class contract.'},
    ],
  },
  {
    id: 'card', title: 'Card', summary: 'Grouped content surface without automatic highlight; interaction styles are opt-in.', Demo: CardDemo,
    code: `<Card>\n  <CardHeader><CardTitle>Local document</CardTitle><CardDescription>Offline ready.</CardDescription></CardHeader>\n  <CardContent>Last saved just now.</CardContent>\n  <CardFooter><Button>Open</Button></CardFooter>\n</Card>`,
    api: [
      {api: 'Card', contract: 'CardProps', description: 'Root surface with variant and density.'},
      {api: 'variant', contract: 'default | muted | elevated | interactive', defaultValue: 'default', description: 'Only interactive opts into hover and focus highlight.'},
      {api: 'density', contract: 'compact | default | comfortable', defaultValue: 'default', description: 'Internal spacing scale.'},
      {api: 'CardHeader / Content / Footer', contract: 'HTMLAttributes<HTMLDivElement>', description: 'Structured content regions.'},
      {api: 'CardTitle / Description', contract: 'Heading / paragraph attributes', description: 'Card naming and context.'},
      {api: 'cardVariants', contract: 'CVA function', description: 'Shared variant class contract.'},
    ],
  },
  {
    id: 'badge', title: 'Badge', summary: 'Compact status or category marker with semantic variants and three sizes.', Demo: BadgeDemo,
    code: `<Badge variant="success">Ready</Badge>\n<Badge variant="warning">Warning</Badge>`,
    api: [
      {api: 'Badge', contract: 'BadgeProps', description: 'Forwards span attributes and ref.'},
      {api: 'variant', contract: 'default | secondary | outline | success | warning | amber | info | destructive', defaultValue: 'default', description: 'Semantic state or emphasis.'},
      {api: 'size', contract: 'sm | default | lg', defaultValue: 'default', description: 'Compact scale.'},
      {api: 'badgeVariants', contract: 'CVA function', description: 'Shared variant class contract.'},
    ],
  },
  {
    id: 'avatar', title: 'Avatar', summary: 'Identity image with initials or text fallback when the image is missing.', Demo: AvatarDemo,
    code: `<Avatar>\n  <AvatarImage src="/avatar.png" alt="Ada Lovelace" />\n  <AvatarFallback>AL</AvatarFallback>\n</Avatar>`,
    api: [
      {api: 'Avatar', contract: 'Base UI Avatar.Root props', description: 'Image and fallback state owner.'},
      {api: 'AvatarImage', contract: 'Base UI Avatar.Image props', description: 'Image source and alt text.'},
      {api: 'AvatarFallback', contract: 'Base UI Avatar.Fallback props', description: 'Required resilient fallback.'},
    ],
  },
  {
    id: 'table', title: 'Table', summary: 'Semantic table parts with horizontal overflow fallback for narrow containers.', Demo: TableDemo,
    code: `<Table>\n  <TableHeader><TableRow><TableHead>Document</TableHead></TableRow></TableHeader>\n  <TableBody><TableRow><TableCell>Landing page</TableCell></TableRow></TableBody>\n</Table>`,
    api: [
      {api: 'Table', contract: 'TableHTMLAttributes<HTMLTableElement>', description: 'Scrollable semantic table.'},
      {api: 'TableHeader / Body / Footer', contract: 'HTML section attributes', description: 'Table regions.'},
      {api: 'TableRow', contract: 'HTMLAttributes<HTMLTableRowElement>', description: 'Semantic row.'},
      {api: 'TableHead / TableCell', contract: 'Th / Td attributes', description: 'Header and data cells.'},
      {api: 'TableCaption', contract: 'HTMLAttributes<HTMLTableCaptionElement>', description: 'Accessible table caption.'},
    ],
  },
  {
    id: 'tabs', title: 'Tabs', summary: 'Keyboard-navigable content views with triggers always contained by TabsList.', Demo: TabsDemo,
    code: `<Tabs defaultValue="preview">\n  <TabsList><TabsTrigger value="preview">Preview</TabsTrigger></TabsList>\n  <TabsContent value="preview">Canvas preview</TabsContent>\n</Tabs>`,
    api: [
      {api: 'Tabs', contract: 'Base UI Tabs.Root props', description: 'Value, orientation, activation mode, and lifecycle.'},
      {api: 'TabsList', contract: 'Base UI List props', description: 'Required trigger container.'},
      {api: 'TabsTrigger', contract: 'Base UI Tab props', description: 'Keyboard-selectable view trigger.'},
      {api: 'TabsContent', contract: 'Base UI Panel props', description: 'Associated view content.'},
      {api: 'tabsListVariants', contract: 'CVA function', description: 'Shared list style contract.'},
    ],
  },
  {
    id: 'separator', title: 'Separator', summary: 'Horizontal or vertical semantic division; decorative mode removes the separator role.', Demo: SeparatorDemo,
    code: `<Separator />\n<Separator orientation="vertical" decorative />`,
    api: [
      {api: 'Separator', contract: 'SeparatorProps', description: 'Forwards div attributes and ref.'},
      {api: 'orientation', contract: 'horizontal | vertical', defaultValue: 'horizontal', description: 'Axis and aria-orientation.'},
      {api: 'decorative', contract: 'boolean', defaultValue: 'false', description: 'Uses role=none when separation is visual only.'},
    ],
  },
]
