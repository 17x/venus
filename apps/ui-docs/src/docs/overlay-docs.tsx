import {useState} from 'react'
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
  Field,
  FieldLabel,
  Input,
  Popover,
  PopoverClose,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
  WithTooltip,
} from '@venus/ui'
import {Copy, MoreHorizontal} from 'lucide-react'
import type {ComponentDocSpec} from './component-doc.tsx'

function DialogDemo() {
  return <Dialog><DialogTrigger render={<Button variant={'outline'}/>}>Open dialog</DialogTrigger><DialogContent><DialogHeader><DialogTitle>Publish local build?</DialogTitle><DialogDescription>The offline document stays on this device until sync is enabled.</DialogDescription></DialogHeader><DialogFooter><DialogClose render={<Button variant={'outline'}/>}>Cancel</DialogClose><DialogClose render={<Button/>}>Publish</DialogClose></DialogFooter></DialogContent></Dialog>
}

function DropdownMenuDemo() {
  const [grid, setGrid] = useState(true)
  return <DropdownMenu><DropdownMenuTrigger render={<Button variant={'outline'}/>}>Document actions</DropdownMenuTrigger><DropdownMenuContent><DropdownMenuGroup><DropdownMenuLabel>Document</DropdownMenuLabel><DropdownMenuItem>Duplicate</DropdownMenuItem><DropdownMenuCheckboxItem checked={grid} onCheckedChange={setGrid}>Show grid</DropdownMenuCheckboxItem></DropdownMenuGroup><DropdownMenuSeparator/><DropdownMenuGroup><DropdownMenuSub><DropdownMenuSubTrigger>Export</DropdownMenuSubTrigger><DropdownMenuSubContent><DropdownMenuGroup><DropdownMenuItem>PNG</DropdownMenuItem><DropdownMenuItem>SVG</DropdownMenuItem></DropdownMenuGroup></DropdownMenuSubContent></DropdownMenuSub></DropdownMenuGroup></DropdownMenuContent></DropdownMenu>
}

function PopoverDemo() {
  return <Popover><PopoverTrigger render={<Button variant={'outline'}/>}>Edit metadata</PopoverTrigger><PopoverContent align={'start'}><PopoverHeader><PopoverTitle>Document metadata</PopoverTitle><PopoverDescription>Stored locally with the document.</PopoverDescription></PopoverHeader><Field className={'mt-4'}><FieldLabel htmlFor={'popover-doc-title'}>Title</FieldLabel><Input id={'popover-doc-title'} defaultValue={'Landing page'}/></Field><div className={'mt-4 flex justify-end'}><PopoverClose render={<Button size={'sm'}/>}>Done</PopoverClose></div></PopoverContent></Popover>
}

function TooltipDemo() {
  return <div className={'flex flex-wrap gap-2'}><WithTooltip content={'Duplicate selection'}><Button aria-label={'Duplicate selection'} size={'icon'} variant={'outline'}><Copy aria-hidden={'true'} data-icon={'inline-start'}/></Button></WithTooltip><WithTooltip content={'More actions'}><Button aria-label={'More actions'} size={'icon'} variant={'ghost'}><MoreHorizontal aria-hidden={'true'} data-icon={'inline-start'}/></Button></WithTooltip></div>
}

export const overlayDocs: readonly ComponentDocSpec[] = [
  {
    id: 'dialog', title: 'Dialog', summary: 'Modal workflow with focus trapping, accessible title and description, and explicit close actions.', Demo: DialogDemo,
    code: `<Dialog>\n  <DialogTrigger render={<Button variant="outline" />}>Open</DialogTrigger>\n  <DialogContent>\n    <DialogHeader><DialogTitle>Publish?</DialogTitle><DialogDescription>Review before publishing.</DialogDescription></DialogHeader>\n    <DialogFooter><DialogClose render={<Button />}>Done</DialogClose></DialogFooter>\n  </DialogContent>\n</Dialog>`,
    api: [
      {api: 'Dialog', contract: 'Base UI Root props', description: 'Open state, modal behavior, and lifecycle.'},
      {api: 'DialogTrigger / DialogClose', contract: 'Base UI trigger/close props', description: 'Use render for custom Base UI triggers.'},
      {api: 'DialogPortal / DialogOverlay', contract: 'Portal / backdrop props', description: 'Document layer and modal backdrop.'},
      {api: 'DialogContent', contract: 'DialogContentProps; showCloseButton', defaultValue: 'true', description: 'Modal popup and optional top-right close action.'},
      {api: 'DialogHeader / DialogFooter', contract: 'HTMLAttributes<HTMLDivElement>', description: 'Title area and responsive actions.'},
      {api: 'DialogTitle / DialogDescription', contract: 'Base UI title/description props', description: 'Required accessible naming and context.'},
    ],
  },
  {
    id: 'dropdown-menu', title: 'DropdownMenu', summary: 'Keyboard-navigable actions, checks, radios, separators, shortcuts, and nested submenus.', Demo: DropdownMenuDemo,
    code: `<DropdownMenu>\n  <DropdownMenuTrigger render={<Button />}>Actions</DropdownMenuTrigger>\n  <DropdownMenuContent>\n    <DropdownMenuGroup>\n      <DropdownMenuItem>Duplicate</DropdownMenuItem>\n      <DropdownMenuCheckboxItem checked={grid}>Show grid</DropdownMenuCheckboxItem>\n    </DropdownMenuGroup>\n  </DropdownMenuContent>\n</DropdownMenu>`,
    api: [
      {api: 'DropdownMenu', contract: 'Base UI Menu.Root props', description: 'Open, modal, focus loop, and lifecycle state.'},
      {api: 'Trigger / Portal / Content', contract: 'Base UI parts + popup positioning', description: 'Trigger and portalled menu surface.'},
      {api: 'Group / Label', contract: 'Base UI group parts', description: 'Required item grouping.'},
      {api: 'Item', contract: 'inset; default | destructive', defaultValue: 'default', description: 'Action item.'},
      {api: 'CheckboxItem', contract: 'checked; onCheckedChange; closeOnClick', defaultValue: 'closeOnClick=false', description: 'Persistent boolean option.'},
      {api: 'RadioGroup / RadioItem', contract: 'value; onValueChange; closeOnClick', description: 'Exclusive option set.'},
      {api: 'Sub / SubTrigger / SubContent', contract: 'Base UI submenu parts', description: 'Nested command hierarchy.'},
      {api: 'Separator / Shortcut', contract: 'Separator props / span attributes', description: 'Grouping divider and key hint.'},
    ],
  },
  {
    id: 'popover', title: 'Popover', summary: 'Small non-modal contextual content anchored to a trigger.', Demo: PopoverDemo,
    code: `<Popover>\n  <PopoverTrigger render={<Button variant="outline" />}>Edit</PopoverTrigger>\n  <PopoverContent>\n    <PopoverHeader><PopoverTitle>Metadata</PopoverTitle><PopoverDescription>Stored locally.</PopoverDescription></PopoverHeader>\n  </PopoverContent>\n</Popover>`,
    api: [
      {api: 'Popover', contract: 'Base UI Root props', description: 'Open, modal, focus, and lifecycle state.'},
      {api: 'PopoverTrigger / PopoverClose', contract: 'Base UI trigger/close props', description: 'Opening and closing actions.'},
      {api: 'PopoverPortal', contract: 'Base UI Portal props', description: 'Document layer target.'},
      {api: 'PopoverContent', contract: 'Popup props + side/align positioning', defaultValue: 'bottom / center', description: 'Anchored contextual surface.'},
      {api: 'PopoverHeader', contract: 'HTMLAttributes<HTMLDivElement>', description: 'Title and description layout.'},
      {api: 'PopoverTitle / Description', contract: 'Base UI title/description props', description: 'Accessible naming and context.'},
    ],
  },
  {
    id: 'tooltip', title: 'Tooltip', summary: 'Supplementary pointer and focus help while the real trigger retains its accessible name.', Demo: TooltipDemo,
    code: `<WithTooltip content="Duplicate selection">\n  <Button aria-label="Duplicate selection" size="icon">…</Button>\n</WithTooltip>`,
    api: [
      {api: 'TooltipProvider', contract: 'delay; closeDelay; timeout', defaultValue: 'delay=400', description: 'Shared timing and coordination.'},
      {api: 'Tooltip', contract: 'Base UI Root props', description: 'Open state and lifecycle.'},
      {api: 'TooltipTrigger', contract: 'Base UI Trigger props', description: 'Pointer/focus trigger with aria-describedby.'},
      {api: 'TooltipContent', contract: 'Popup props + side/align positioning', defaultValue: 'top / center', description: 'Portalled help content.'},
      {api: 'WithTooltip', contract: 'content; delay; side; align; offsets', description: 'Optional wrapper that returns its child unchanged when empty.'},
    ],
  },
]
