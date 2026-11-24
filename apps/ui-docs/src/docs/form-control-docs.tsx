import {
  Combobox,
  ComboboxClear,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxInputGroup,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
  Field,
  FieldDescription,
  FieldLabel,
  Input,
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  NativeSelect,
  NumberInput,
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@venus/ui'
import {Search} from 'lucide-react'
import type {ComponentDocSpec} from './component-doc.tsx'

const runtimes = [
  {label: 'Browser', value: 'browser'},
  {label: 'Node.js', value: 'node'},
  {label: 'Java', value: 'java'},
  {label: 'C', value: 'c'},
]

function InputDemo() {
  return <Field><FieldLabel htmlFor={'input-demo'}>Project name</FieldLabel><Input id={'input-demo'} placeholder={'Venus'}/><FieldDescription>Stored locally by default.</FieldDescription></Field>
}

function TextareaDemo() {
  return <Field><FieldLabel htmlFor={'textarea-demo'}>Notes</FieldLabel><Textarea id={'textarea-demo'} placeholder={'Optional implementation notes'}/></Field>
}

function InputGroupDemo() {
  return <Field>
    <FieldLabel htmlFor={'input-group-demo'}>Asset search</FieldLabel>
    <InputGroup>
      <InputGroupInput id={'input-group-demo'} placeholder={'Search local assets'}/>
      <InputGroupAddon align={'inline-end'}>
        <InputGroupButton aria-label={'Search assets'} size={'sm'} variant={'secondary'}><Search aria-hidden={'true'} data-icon={'inline-start'}/>Search</InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  </Field>
}

function NumberInputDemo() {
  return <Field>
    <FieldLabel htmlFor={'number-demo'}>Scale</FieldLabel>
    <NumberInput
      allowWheelScrub
      defaultValue={1.25}
      min={0}
      max={10}
      step={0.25}
      format={{maximumFractionDigits: 2}}
      inputProps={{id: 'number-demo'}}
      decrementTooltip={'Decrease by 0.25'}
      incrementTooltip={'Increase by 0.25'}
    />
    <FieldDescription>Supports decimals. Focus the input, keep the pointer over it, then use the mouse wheel.</FieldDescription>
  </Field>
}

function SelectDemo() {
  return <Field>
    <FieldLabel htmlFor={'select-demo'}>Runtime</FieldLabel>
    <Select items={runtimes} defaultValue={'browser'} id={'select-demo'}>
      <SelectTrigger><SelectValue/></SelectTrigger>
      <SelectContent>
        <SelectGroup>{runtimes.map((runtime) => <SelectItem key={runtime.value} value={runtime.value}>{runtime.label}</SelectItem>)}</SelectGroup>
      </SelectContent>
    </Select>
  </Field>
}

function NativeSelectDemo() {
  return <Field>
    <FieldLabel htmlFor={'native-select-demo'}>Fallback runtime</FieldLabel>
    <NativeSelect id={'native-select-demo'} defaultValue={'browser'}>
      <option value={'browser'}>Browser</option><option value={'server'}>Server</option>
    </NativeSelect>
    <FieldDescription>Uses the operating system menu when JavaScript behavior is unnecessary.</FieldDescription>
  </Field>
}

function ComboboxDemo() {
  return <Field>
    <FieldLabel htmlFor={'combobox-demo'}>Search runtime</FieldLabel>
    <Combobox items={runtimes} defaultValue={runtimes[0]}>
      <ComboboxInputGroup><ComboboxInput id={'combobox-demo'} placeholder={'Type to filter'}/><ComboboxClear/><ComboboxTrigger/></ComboboxInputGroup>
      <ComboboxContent><ComboboxEmpty>No runtime found.</ComboboxEmpty><ComboboxList>{(runtime: typeof runtimes[number]) => <ComboboxItem key={runtime.value} value={runtime}>{runtime.label}</ComboboxItem>}</ComboboxList></ComboboxContent>
    </Combobox>
  </Field>
}

export const formControlDocs: readonly ComponentDocSpec[] = [
  {
    id: 'input', title: 'Input', summary: 'Single-line native input with shared sizing, validation, disabled, and field-description contracts.', Demo: InputDemo,
    code: `<Field>\n  <FieldLabel htmlFor="name">Project name</FieldLabel>\n  <Input id="name" placeholder="Venus" />\n  <FieldDescription>Stored locally by default.</FieldDescription>\n</Field>`,
    api: [
      {api: 'Input', contract: 'InputProps', description: 'Forwards standard input attributes and ref.'},
      {api: 'controlSize', contract: 'sm | md | lg', defaultValue: 'md', description: 'Shared control height and text scale.'},
      {api: 'validation', contract: 'ValidationTone', defaultValue: 'Field value', description: 'Overrides inherited field validation.'},
    ],
  },
  {
    id: 'textarea', title: 'Textarea', summary: 'Multi-line native text entry aligned with Input sizing and field semantics.', Demo: TextareaDemo,
    code: `<Field>\n  <FieldLabel htmlFor="notes">Notes</FieldLabel>\n  <Textarea id="notes" placeholder="Optional notes" />\n</Field>`,
    api: [
      {api: 'Textarea', contract: 'TextareaProps', description: 'Forwards standard textarea attributes and ref.'},
      {api: 'controlSize', contract: 'sm | md | lg', defaultValue: 'md', description: 'Minimum control height scale.'},
      {api: 'validation', contract: 'ValidationTone', defaultValue: 'Field value', description: 'Validation color and aria-invalid source.'},
    ],
  },
  {
    id: 'input-group', title: 'InputGroup', summary: 'One seamless input surface for text, prefixes, suffixes, and attached actions.', Demo: InputGroupDemo,
    code: `<InputGroup>\n  <InputGroupInput aria-label="Asset search" />\n  <InputGroupAddon align="inline-end">\n    <InputGroupButton variant="secondary">Search</InputGroupButton>\n  </InputGroupAddon>\n</InputGroup>`,
    api: [
      {api: 'InputGroup', contract: 'InputGroupProps', description: 'Owns border, focus, size, validation, and disabled state.'},
      {api: 'InputGroupInput', contract: 'InputGroupInputProps', description: 'Borderless input that fills the shared surface.'},
      {api: 'InputGroupTextarea', contract: 'InputGroupTextareaProps', description: 'Borderless multi-line control.'},
      {api: 'InputGroupAddon', contract: 'align: inline-start | inline-end | block-start | block-end', defaultValue: 'inline-start', description: 'Positions text, icons, or attached buttons.'},
      {api: 'InputGroupButton', contract: 'ButtonProps; xs | sm | icon-xs | icon-sm', defaultValue: 'icon-sm / ghost', description: 'Action joined to the group edge without a gap.'},
      {api: 'InputGroupText', contract: 'HTMLAttributes<HTMLSpanElement>', description: 'Non-interactive prefix or suffix content.'},
    ],
  },
  {
    id: 'number-input', title: 'NumberInput', summary: 'Formatted numeric input with a vertical stepper, decimal steps, keyboard arrows, and opt-in wheel scrubbing.', Demo: NumberInputDemo,
    code: `<NumberInput\n  defaultValue={1.25}\n  min={0}\n  max={10}\n  step={0.25}\n  allowWheelScrub\n  format={{ maximumFractionDigits: 2 }}\n/>`,
    api: [
      {api: 'NumberInput', contract: 'NumberInputProps', description: 'Extends Base UI NumberField.Root props.'},
      {api: 'value / defaultValue', contract: 'number | null / number', description: 'Controlled or uncontrolled numeric value.'},
      {api: 'min / max / step', contract: 'number; step also accepts any', defaultValue: 'step=1', description: 'Range and decimal stepping contract.'},
      {api: 'smallStep / largeStep', contract: 'number', defaultValue: '0.1 / 10', description: 'Meta-key and Shift-key step sizes.'},
      {api: 'format / locale', contract: 'Intl.NumberFormatOptions / Intl.LocalesArgument', description: 'Locale-aware display formatting.'},
      {api: 'allowWheelScrub', contract: 'boolean', defaultValue: 'false', description: 'Focused-and-hovered mouse wheel stepping.'},
      {api: 'inputProps', contract: 'NumberField.Input.Props', description: 'Input id, aria, placeholder, and class forwarding.'},
      {api: 'incrementLabel / decrementLabel', contract: 'string', description: 'Accessible stepper names.'},
      {api: 'incrementTooltip / decrementTooltip', contract: 'ReactNode', description: 'Optional supplementary help.'},
    ],
  },
  {
    id: 'select', title: 'Select', summary: 'Theme-consistent Base UI popup selection with keyboard navigation and grouped items.', Demo: SelectDemo,
    code: `const items = [{ label: 'Browser', value: 'browser' }]\n\n<Select items={items} defaultValue="browser">\n  <SelectTrigger><SelectValue /></SelectTrigger>\n  <SelectContent>\n    <SelectGroup>\n      <SelectItem value="browser">Browser</SelectItem>\n    </SelectGroup>\n  </SelectContent>\n</Select>`,
    api: [
      {api: 'Select', contract: 'SelectProps<Value, Multiple>', description: 'Root state; supports items, forms, single/multiple, controlled/open state.'},
      {api: 'SelectTrigger', contract: 'Base UI Trigger props', description: 'Sized button with field validation and disabled propagation.'},
      {api: 'SelectValue', contract: 'placeholder; children or render function', description: 'Selected value label.'},
      {api: 'SelectContent', contract: 'Popup props + side/align positioning', defaultValue: 'bottom / start', description: 'Portalled, theme-consistent option popup.'},
      {api: 'SelectGroup / SelectLabel', contract: 'Base UI group parts', description: 'Required option grouping and optional group heading.'},
      {api: 'SelectItem', contract: 'value; disabled; label', description: 'Keyboard and pointer selectable item.'},
      {api: 'SelectSeparator', contract: 'Separator props', description: 'Divides item groups.'},
      {api: 'SelectScrollUpButton / DownButton', contract: 'Scroll arrow props', description: 'Overflow scrolling affordances.'},
    ],
  },
  {
    id: 'native-select', title: 'NativeSelect', summary: 'No-JavaScript fallback that intentionally uses the operating-system option popup.', Demo: NativeSelectDemo,
    code: `<NativeSelect aria-label="Runtime" defaultValue="browser">\n  <option value="browser">Browser</option>\n  <option value="server">Server</option>\n</NativeSelect>`,
    api: [
      {api: 'NativeSelect', contract: 'NativeSelectProps', description: 'Forwards native select attributes, options, and ref.'},
      {api: 'controlSize', contract: 'sm | md | lg', defaultValue: 'md', description: 'Shared form size.'},
      {api: 'validation', contract: 'ValidationTone', defaultValue: 'Field value', description: 'Shared state styling and aria-invalid.'},
    ],
  },
  {
    id: 'combobox', title: 'Combobox', summary: 'Editable searchable selection with filtering, empty fallback, clear, and trigger actions.', Demo: ComboboxDemo,
    code: `<Combobox items={runtimes}>\n  <ComboboxInputGroup>\n    <ComboboxInput aria-label="Runtime" />\n    <ComboboxClear />\n    <ComboboxTrigger />\n  </ComboboxInputGroup>\n  <ComboboxContent>\n    <ComboboxEmpty>No result.</ComboboxEmpty>\n    <ComboboxList>{item => <ComboboxItem value={item}>{item.label}</ComboboxItem>}</ComboboxList>\n  </ComboboxContent>\n</Combobox>`,
    api: [
      {api: 'Combobox', contract: 'ComboboxProps<Value, Multiple>', description: 'Root filtering, selection, form, and open state.'},
      {api: 'ComboboxInputGroup / Input', contract: 'Base UI input parts', description: 'Shared searchable input surface.'},
      {api: 'ComboboxClear / Trigger', contract: 'Button part props', description: 'Optional clear and popup actions.'},
      {api: 'ComboboxContent / List', contract: 'Popup positioning / render list', description: 'Portalled result surface and collection.'},
      {api: 'ComboboxItem', contract: 'value; disabled; index', description: 'Filterable and selectable result.'},
      {api: 'ComboboxGroup / GroupLabel', contract: 'Base UI group parts', description: 'Grouped result structure.'},
      {api: 'ComboboxEmpty', contract: 'Base UI empty props', description: 'No-results fallback.'},
    ],
  },
]
