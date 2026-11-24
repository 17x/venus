import {useState} from 'react'
import {
  Checkbox,
  CompactInputField,
  CompactSelectField,
  Field,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldMessage,
  FieldSet,
  Input,
  RadioGroup,
  RadioItem,
  Slider,
  Switch,
} from '@venus/ui'
import type {ComponentDocSpec} from './component-doc.tsx'

function FieldDemo() {
  return <FieldGroup columns={2}>
    <Field validation={'success'}><FieldLabel htmlFor={'field-success'}>Hostname</FieldLabel><Input id={'field-success'} defaultValue={'venus.local'}/><FieldMessage>Available.</FieldMessage></Field>
    <Field validation={'error'}><FieldLabel htmlFor={'field-error'}>Slug</FieldLabel><Input id={'field-error'} defaultValue={'invalid/name'}/><FieldMessage>Use letters, numbers, or dashes.</FieldMessage></Field>
  </FieldGroup>
}

function CompactFieldDemo() {
  return <FieldGroup columns={2}>
    <CompactInputField label={'Opacity'} suffix={'%'} defaultValue={'100'}/>
    <CompactSelectField label={'Unit'} defaultValue={'px'}><option value={'px'}>Pixels</option><option value={'percent'}>Percent</option></CompactSelectField>
  </FieldGroup>
}

function CheckboxDemo() {
  const [checked, setChecked] = useState(true)
  return <FieldSet><FieldLegend>Preview</FieldLegend><Field orientation={'horizontal'}><Checkbox id={'checkbox-demo'} checked={checked} onChange={(event) => setChecked(event.target.checked)}/><FieldLabel htmlFor={'checkbox-demo'}>Enable previews</FieldLabel></Field></FieldSet>
}

function RadioDemo() {
  const [value, setValue] = useState('comfortable')
  return <RadioGroup label={'Density'} orientation={'horizontal'} value={value} onValueChange={setValue}><RadioItem value={'compact'} label={'Compact'}/><RadioItem value={'comfortable'} label={'Comfortable'}/></RadioGroup>
}

function SwitchDemo() {
  const [checked, setChecked] = useState(false)
  return <Field orientation={'horizontal'}><FieldLabel htmlFor={'switch-demo'}>Sync when online</FieldLabel><Switch id={'switch-demo'} checked={checked} onCheckedChange={setChecked}/></Field>
}

function SliderDemo() {
  const [value, setValue] = useState(72)
  return <Slider label={'Preview scale'} showValue value={value} min={25} max={100} onValueChange={setValue}/>
}

export const formChoiceDocs: readonly ComponentDocSpec[] = [
  {
    id: 'field', title: 'Field', summary: 'Form layout and semantic propagation for labels, descriptions, validation, disabled state, and responsive groups.', Demo: FieldDemo,
    code: `<Field validation="error">\n  <FieldLabel htmlFor="slug">Slug</FieldLabel>\n  <Input id="slug" />\n  <FieldMessage>Use letters, numbers, or dashes.</FieldMessage>\n</Field>`,
    api: [
      {api: 'Field', contract: 'FieldProps', description: 'Root state and vertical, horizontal, or responsive layout.'},
      {api: 'validation', contract: 'default | success | warning | error', defaultValue: 'default', description: 'Propagates visual and aria state to child controls.'},
      {api: 'disabled', contract: 'boolean', defaultValue: 'false', description: 'Propagates disabled state.'},
      {api: 'FieldLabel / FieldTitle', contract: 'label / div attributes', description: 'Control label or non-label field heading.'},
      {api: 'FieldDescription / FieldMessage', contract: 'HTMLAttributes<HTMLParagraphElement>', description: 'Registered helper and live validation text.'},
      {api: 'FieldContent', contract: 'HTMLAttributes<HTMLDivElement>', description: 'Content wrapper for horizontal/responsive layouts.'},
      {api: 'FieldGroup', contract: 'columns: 1 | 2 | 3', defaultValue: '1', description: 'Responsive field grid.'},
      {api: 'FieldSet / FieldLegend', contract: 'fieldset / legend attributes', description: 'Related controls and accessible group name.'},
    ],
  },
  {
    id: 'compact-field', title: 'Compact fields', summary: 'Dense labelled native controls for property panels; not a replacement for standard product forms.', Demo: CompactFieldDemo,
    code: `<FieldGroup columns={2}>\n  <CompactInputField label="Opacity" suffix="%" />\n  <CompactSelectField label="Unit"><option>Pixels</option></CompactSelectField>\n</FieldGroup>`,
    api: [
      {api: 'CompactInputField', contract: 'InputProps + label, prefix, suffix, description, error', description: 'Dense text or numeric property input.'},
      {api: 'CompactSelectField', contract: 'NativeSelectProps + label, suffix, description, error', description: 'Dense native-select fallback.'},
    ],
  },
  {
    id: 'checkbox', title: 'Checkbox', summary: 'Native boolean or indeterminate form control with visible hover, focus, checked, and disabled states.', Demo: CheckboxDemo,
    code: `<Field orientation="horizontal">\n  <Checkbox id="preview" checked={checked} onChange={onChange} />\n  <FieldLabel htmlFor="preview">Enable previews</FieldLabel>\n</Field>`,
    api: [
      {api: 'Checkbox', contract: 'CheckboxProps', description: 'Forwards native checkbox attributes and ref.'},
      {api: 'checked / defaultChecked', contract: 'boolean', description: 'Controlled or uncontrolled state.'},
      {api: 'indeterminate', contract: 'boolean', defaultValue: 'false', description: 'Displays a dash and updates native indeterminate state.'},
      {api: 'size', contract: 'sm | default | lg', defaultValue: 'default', description: 'Visual box size; hit target remains larger.'},
    ],
  },
  {
    id: 'radio-group', title: 'RadioGroup', summary: 'Exclusive choice group with keyboard arrows, orientation, label, disabled state, and controlled values.', Demo: RadioDemo,
    code: `<RadioGroup label="Density" value={value} onValueChange={setValue}>\n  <RadioItem value="compact" label="Compact" />\n  <RadioItem value="comfortable" label="Comfortable" />\n</RadioGroup>`,
    api: [
      {api: 'RadioGroup', contract: 'RadioGroupProps', description: 'Controlled/uncontrolled exclusive group.'},
      {api: 'value / defaultValue', contract: 'string', description: 'Selected item value.'},
      {api: 'onValueChange', contract: '(value: string) => void', description: 'Selection callback.'},
      {api: 'orientation', contract: 'horizontal | vertical', defaultValue: 'vertical', description: 'Layout and keyboard direction.'},
      {api: 'label', contract: 'ReactNode', description: 'Accessible group name.'},
      {api: 'RadioItem', contract: 'value; label; disabled', description: 'Individual choice.'},
    ],
  },
  {
    id: 'switch', title: 'Switch', summary: 'Immediate on/off setting control with pointer, keyboard, focus, hover, and disabled behavior.', Demo: SwitchDemo,
    code: `<Field orientation="horizontal">\n  <FieldLabel htmlFor="sync">Sync when online</FieldLabel>\n  <Switch id="sync" checked={checked} onCheckedChange={setChecked} />\n</Field>`,
    api: [
      {api: 'Switch', contract: 'SwitchProps', description: 'Button-like switch with controlled or uncontrolled state.'},
      {api: 'checked / defaultChecked', contract: 'boolean', description: 'Current or initial state.'},
      {api: 'onCheckedChange', contract: '(checked: boolean) => void', description: 'State callback.'},
      {api: 'disabled', contract: 'boolean', defaultValue: 'Field value', description: 'Interaction and visual disabled state.'},
    ],
  },
  {
    id: 'slider', title: 'Slider', summary: 'Base UI range control that tracks the pointer directly and exposes visible hover, drag, focus, and disabled states.', Demo: SliderDemo,
    code: `<Slider\n  label="Preview scale"\n  showValue\n  value={value}\n  min={25}\n  max={100}\n  step={1}\n  onValueChange={setValue}\n/>`,
    api: [
      {api: 'Slider', contract: 'SliderProps', description: 'Single-value Base UI slider root.'},
      {api: 'value / defaultValue', contract: 'number', defaultValue: '0', description: 'Controlled or uncontrolled value.'},
      {api: 'min / max / step / largeStep', contract: 'number', defaultValue: '0 / 100 / 1 / 10', description: 'Range and keyboard granularity.'},
      {api: 'onValueChange', contract: '(value: number) => void', description: 'Continuous pointer and keyboard updates.'},
      {api: 'onValueCommitted', contract: 'Base UI commit callback', description: 'Pointer-up or committed keyboard value.'},
      {api: 'label / showValue', contract: 'string / boolean', defaultValue: 'undefined / false', description: 'Accessible visible label and formatted output.'},
      {api: 'format / locale', contract: 'Intl.NumberFormatOptions / Intl.LocalesArgument', description: 'Displayed value formatting.'},
      {api: 'size', contract: 'sm | default', defaultValue: 'default', description: 'Visual thumb scale.'},
    ],
  },
]
