import {CollapsibleNav, ThemeMenu} from '@venus/ui'
import type {ComponentDocSpec} from './component-doc.tsx'

function CollapsibleNavDemo() {
  return <div className={'max-w-xs'}><CollapsibleNav ariaLabel={'Example navigation'} items={[
    {id: 'example-forms', label: 'Forms', items: [{id: 'example-input', label: 'Input', href: '#input'}, {id: 'example-select', label: 'Select', href: '#select'}]},
    {id: 'example-feedback', label: 'Feedback', items: [{id: 'example-alert', label: 'Alert', href: '#alert'}]},
  ]}/></div>
}

function ThemeMenuDemo() {
  return <ThemeMenu title={'Change theme'} labels={{classicLight: 'Classic light', classicDark: 'Classic dark', cartoon: 'Cartoon light', cartoonDark: 'Cartoon dark'}}/>
}

export const navigationDocs: readonly ComponentDocSpec[] = [
  {
    id: 'collapsible-nav', title: 'CollapsibleNav', summary: 'Nested tree navigation with default-open branches, keyboard-operable toggles, and direct links.', Demo: CollapsibleNavDemo,
    code: `<CollapsibleNav\n  ariaLabel="UI documentation"\n  items={[{\n    id: 'forms',\n    label: 'Forms',\n    items: [{ id: 'input', label: 'Input', href: '#input' }],\n  }]}\n/>`,
    api: [
      {api: 'CollapsibleNav', contract: 'CollapsibleNavProps', description: 'Navigation root and controlled branch state.'},
      {api: 'ariaLabel', contract: 'string', description: 'Required accessible navigation name.'},
      {api: 'items', contract: 'readonly CollapsibleNavItem[]', description: 'Branch or leaf navigation data.'},
      {api: 'CollapsibleNavItem', contract: 'id; label; href?; items?', description: 'Stable tree node contract.'},
    ],
  },
  {
    id: 'theme-menu', title: 'ThemeMenu', summary: 'Shared theme selector for Classic and Cartoon families, each with light and dark appearances.', Demo: ThemeMenuDemo,
    code: `<ThemeMenu\n  title="Change theme"\n  labels={{\n    classicLight: 'Classic light',\n    classicDark: 'Classic dark',\n    cartoon: 'Cartoon light',\n    cartoonDark: 'Cartoon dark',\n  }}\n/>`,
    api: [
      {api: 'ThemeMenu', contract: 'HTMLAttributes<HTMLDivElement> + title + labels', description: 'Menu trigger, selected theme state, and persistent application.'},
      {api: 'title', contract: 'string', defaultValue: 'Theme', description: 'Trigger accessible name.'},
      {api: 'labels', contract: 'Partial<ThemeLabels>', description: 'Localized labels for four built-in themes.'},
      {api: 'ThemeName', contract: 'classic-light | classic-dark | cartoon | cartoon-dark', description: 'Persisted semantic theme identifier.'},
      {api: 'themeNames / isThemeName / isDarkTheme', contract: 'Theme utilities', description: 'Enumeration and safe parsing helpers.'},
      {api: 'resolveThemeName / themeStorageKey', contract: 'Theme resolver / string', description: 'Stored-theme fallback and storage contract.'},
    ],
  },
]
