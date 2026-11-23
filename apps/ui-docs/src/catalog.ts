export interface UiApiItem {
  name: string
  contract: string
  purpose: string
}

export interface UiApiGroup {
  title: string
  entry: '@venus/ui' | '@venus/ui/vector'
  status: 'preferred' | 'product-specific'
  items: readonly UiApiItem[]
}

export const uiApiGroups: readonly UiApiGroup[] = [
  {
    title: 'App-neutral components',
    entry: '@venus/ui',
    status: 'preferred',
    items: [
      {name: 'Alert', contract: 'AlertProps · 5 variants', purpose: 'Inline status and feedback'},
      {name: 'Avatar', contract: 'Root / Image / Fallback', purpose: 'Identity image with failure fallback'},
      {name: 'Badge', contract: 'BadgeProps · 8 variants · 3 sizes', purpose: 'Compact state labels'},
      {name: 'Button', contract: 'ButtonProps · 6 variants · 8 sizes', purpose: 'Primary and secondary actions'},
      {name: 'Card', contract: 'CardProps · 4 variants · 3 densities', purpose: 'Grouped content surfaces'},
      {name: 'Checkbox', contract: 'CheckboxProps · 3 sizes', purpose: 'Boolean and indeterminate input'},
      {name: 'CollapsibleNav', contract: 'CollapsibleNavProps', purpose: 'Nested documentation navigation'},
      {name: 'Dialog', contract: 'Base UI dialog parts', purpose: 'Modal focus and dismissal workflow'},
      {name: 'Empty', contract: 'Composable empty-state parts', purpose: 'Missing-content fallback'},
      {name: 'Field', contract: '1–3 responsive columns · 3 orientations', purpose: 'Labels, descriptions, and field layout'},
      {name: 'Input / Select / Textarea', contract: 'Native props · sm / md / lg', purpose: 'Text and option input'},
      {name: 'InputGroup', contract: 'Input / addon / button / textarea', purpose: 'Composed text controls'},
      {name: 'NumberInput', contract: 'Base UI number field · sm / md / lg', purpose: 'Validated numeric stepping'},
      {name: 'Progress / Spinner', contract: 'Named progress contracts', purpose: 'Determinate and pending work'},
      {name: 'RadioGroup', contract: 'RadioGroupProps / RadioItemProps', purpose: 'Exclusive selection'},
      {name: 'Separator', contract: 'SeparatorProps', purpose: 'Semantic visual division'},
      {name: 'Skeleton', contract: 'SkeletonProps · 5 variants', purpose: 'Loading placeholders'},
      {name: 'Slider', contract: 'SliderProps · controlled or uncontrolled', purpose: 'Numeric range input'},
      {name: 'Switch', contract: 'SwitchProps · controlled or uncontrolled', purpose: 'Immediate on/off settings'},
      {name: 'Table', contract: 'Semantic table parts', purpose: 'Tabular data with overflow fallback'},
      {name: 'Tabs', contract: 'Base UI tabs parts', purpose: 'Keyboard-navigable content views'},
      {name: 'ThemeMenu', contract: '2 families · light and dark', purpose: 'Shared semantic theme selection'},
      {name: 'Tooltip / WithTooltip', contract: 'Base UI parts · optional wrapper', purpose: 'Supplemental hover and focus help'},
    ],
  },
  {
    title: 'Vector editor surface',
    entry: '@venus/ui/vector',
    status: 'product-specific',
    items: [
      {name: 'Button / IconButton', contract: 'Vector ButtonProps', purpose: 'Dense editor actions'},
      {name: 'ContextMenu / DropdownMenu', contract: 'Base UI primitives', purpose: 'Editor menus and nested commands'},
      {name: 'Input / InputGroup', contract: 'Vector control props', purpose: 'Dense property controls'},
      {name: 'Modal / Notification', contract: 'Vector workflow APIs', purpose: 'Editor overlays and feedback'},
      {name: 'Select', contract: 'SelectProps / SelectItemProps', purpose: 'Dense editor selection'},
      {name: 'Tabs / Tooltip', contract: 'Base UI primitives', purpose: 'Panels and discoverability'},
      {name: 'ThemeProvider', contract: 'ThemeMode / ThemePalette', purpose: 'Editor-specific light and dark themes'},
    ],
  },
] as const

export const installSnippet = `import '@venus/ui/styles.css'
import { Button, Card, Input } from '@venus/ui'`
export const inputGroupSnippet = `<InputGroup>
  <InputGroupInput aria-label="Search" />
  <InputGroupAddon align="inline-end">
    <InputGroupButton>Search</InputGroupButton>
  </InputGroupAddon>
</InputGroup>`
export const tooltipSnippet = `<WithTooltip content="Duplicate">
  <Button aria-label="Duplicate" size="icon">…</Button>
</WithTooltip>`
export const vectorSnippet = `import { DropdownMenu, IconButton } from '@venus/ui/vector'`
