import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  Field,
  FieldGroup,
  FieldLabel,
  FieldMessage,
  FormErrorSummary,
  Input,
  Progress,
  Skeleton,
  Spinner,
  toast,
} from '@venus/ui'
import {CheckCircle2, FilePlus2} from 'lucide-react'
import type {ComponentDocSpec} from './component-doc.tsx'

function AlertDemo() {
  return <Alert variant={'success'}><CheckCircle2 aria-hidden={'true'}/><AlertTitle>Saved locally</AlertTitle><AlertDescription>Cloud availability does not affect this document.</AlertDescription></Alert>
}

function ErrorSummaryDemo() {
  return <div className={'flex flex-col gap-4'}><FormErrorSummary errors={[{id: 'error-name', message: 'Name is required.'}, {id: 'error-file', message: 'Choose a supported file.'}]}/><FieldGroup columns={2}><Field validation={'error'}><FieldLabel htmlFor={'error-name'}>Name</FieldLabel><Input id={'error-name'}/><FieldMessage>Name is required.</FieldMessage></Field><Field validation={'error'}><FieldLabel htmlFor={'error-file'}>File</FieldLabel><Input id={'error-file'} type={'file'}/><FieldMessage>Choose a supported file.</FieldMessage></Field></FieldGroup></div>
}

function ToastDemo() {
  return <Button onClick={() => toast.success('Saved locally', {description: 'Cloud access is not required.'})}>Show toast</Button>
}

function EmptyDemo() {
  return <Empty><EmptyHeader><EmptyMedia><FilePlus2 aria-hidden={'true'}/></EmptyMedia><EmptyTitle>No local documents</EmptyTitle><EmptyDescription>Create a document now; enable sync later.</EmptyDescription></EmptyHeader><EmptyContent><Button size={'sm'}>Create document</Button></EmptyContent></Empty>
}

function ProgressDemo() {
  return <Progress label={'Upload progress'} showLabel showValue value={68}/>
}

function SpinnerDemo() {
  return <div className={'flex flex-wrap items-center gap-3'}><Spinner label={'Loading profile'}/><Button disabled><Spinner data-icon={'inline-start'} label={'Saving locally'}/>Saving…</Button></div>
}

function SkeletonDemo() {
  return <div className={'flex flex-col gap-3'}><Skeleton className={'h-4 w-2/3'}/><Skeleton className={'h-4 w-1/2'}/><Skeleton variant={'card'}/></div>
}

export const feedbackDocs: readonly ComponentDocSpec[] = [
  {
    id: 'alert', title: 'Alert', summary: 'Persistent inline status for neutral, informational, success, warning, and destructive feedback.', Demo: AlertDemo,
    code: `<Alert variant="success">\n  <AlertTitle>Saved locally</AlertTitle>\n  <AlertDescription>Cloud availability does not affect this document.</AlertDescription>\n</Alert>`,
    api: [
      {api: 'Alert', contract: 'AlertProps; default | info | success | warning | destructive', defaultValue: 'default', description: 'Status container; destructive uses role=alert.'},
      {api: 'AlertTitle', contract: 'HTMLAttributes<HTMLHeadingElement>', description: 'Short status heading.'},
      {api: 'AlertDescription', contract: 'HTMLAttributes<HTMLParagraphElement>', description: 'Supporting status text.'},
      {api: 'alertVariants', contract: 'CVA function', description: 'Shared variant class contract.'},
    ],
  },
  {
    id: 'form-error-summary', title: 'FormErrorSummary', summary: 'Focusable failed-submission summary whose items link directly to invalid controls.', Demo: ErrorSummaryDemo,
    code: `<FormErrorSummary errors={[\n  { id: 'name', message: 'Name is required.' },\n  { id: 'file', message: 'Choose a supported file.' },\n]} />`,
    api: [
      {api: 'FormErrorSummary', contract: 'FormErrorSummaryProps', description: 'Returns null for an empty error list and forwards div attributes/ref.'},
      {api: 'errors', contract: 'readonly FormErrorSummaryItem[]', description: 'Required id, message, and optional href per error.'},
      {api: 'title', contract: 'ReactNode', defaultValue: 'Check the highlighted fields', description: 'Accessible summary heading.'},
    ],
  },
  {
    id: 'toast', title: 'Toast', summary: 'Transient Sonner notification for completed or failed actions; mount one Toaster per application.', Demo: ToastDemo,
    code: `<Toaster position="bottom-right" />\n\ntoast.success('Saved locally', {\n  description: 'Cloud access is not required.',\n})`,
    api: [
      {api: 'Toaster', contract: 'ToasterProps', description: 'Application host; position, duration, icons, offsets, and toast defaults.'},
      {api: 'toast', contract: 'Sonner toast function', description: 'Default message with optional description, action, and lifecycle.'},
      {api: 'toast.success / info / warning / error / loading', contract: 'Typed toast functions', description: 'Semantic notification variants.'},
      {api: 'toast.promise / dismiss', contract: 'Promise binding / id dismissal', description: 'Async lifecycle and imperative removal.'},
    ],
  },
  {
    id: 'empty', title: 'Empty', summary: 'Structured fallback for a collection or workflow that currently has no content.', Demo: EmptyDemo,
    code: `<Empty>\n  <EmptyHeader><EmptyTitle>No documents</EmptyTitle><EmptyDescription>Create one locally.</EmptyDescription></EmptyHeader>\n  <EmptyContent><Button>Create document</Button></EmptyContent>\n</Empty>`,
    api: [
      {api: 'Empty', contract: 'HTMLAttributes<HTMLDivElement>', description: 'Fallback root layout.'},
      {api: 'EmptyHeader / EmptyContent', contract: 'HTMLAttributes<HTMLDivElement>', description: 'Message and action layout regions.'},
      {api: 'EmptyMedia', contract: 'HTMLAttributes<HTMLDivElement>', description: 'Optional visual or icon region.'},
      {api: 'EmptyTitle / EmptyDescription', contract: 'HTMLAttributes<HTMLHeadingElement / ParagraphElement>', description: 'Accessible empty-state message.'},
    ],
  },
  {
    id: 'progress', title: 'Progress', summary: 'Determinate progress with accessible name and optional visible label and value.', Demo: ProgressDemo,
    code: `<Progress label="Upload progress" showLabel showValue value={68} />`,
    api: [
      {api: 'Progress', contract: 'ProgressProps', description: 'Progressbar root and indicator.'},
      {api: 'value / max', contract: 'number', defaultValue: '0 / 100', description: 'Current and maximum progress.'},
      {api: 'label', contract: 'string', description: 'Required accessible progress name.'},
      {api: 'showLabel / showValue', contract: 'boolean', defaultValue: 'false', description: 'Visible metadata controls.'},
    ],
  },
  {
    id: 'spinner', title: 'Spinner', summary: 'Named indeterminate status and the composable loading affordance used inside disabled buttons.', Demo: SpinnerDemo,
    code: `<Button disabled>\n  <Spinner data-icon="inline-start" label="Saving locally" />\n  Saving…\n</Button>`,
    api: [
      {api: 'Spinner', contract: 'SpinnerProps', description: 'Forwards span attributes and ref with role=status.'},
      {api: 'label', contract: 'string', description: 'Required accessible loading name.'},
    ],
  },
  {
    id: 'skeleton', title: 'Skeleton', summary: 'Non-interactive loading placeholder with text, avatar, button, card, and custom shapes.', Demo: SkeletonDemo,
    code: `<Skeleton className="h-4 w-2/3" />\n<Skeleton variant="card" />`,
    api: [
      {api: 'Skeleton', contract: 'SkeletonProps', description: 'Forwards div attributes and ref.'},
      {api: 'variant', contract: 'text | avatar | button | card | default', defaultValue: 'default', description: 'Named placeholder geometry.'},
      {api: 'skeletonVariants', contract: 'CVA function', description: 'Shared variant class contract.'},
    ],
  },
]
