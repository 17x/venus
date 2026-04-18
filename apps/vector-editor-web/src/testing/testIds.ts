export const TEST_IDS = {
  inspector: {
    workspace: 'inspector.workspace',
    panelStack: 'inspector.panel-stack',
    shortcutRail: 'inspector.shortcut-rail',
    shortcutToggle: (panelId: string) => `inspector.toggle-panel.${panelId}`,
  },
  sidebarLeft: {
    workspace: 'sidebar.left.workspace',
    tabRail: 'sidebar.left.tab-rail',
    tabTrigger: (tabId: string) => `sidebar.left.switch-tab.${tabId}`,
    historyTimeline: 'sidebar.left.history.timeline',
  },
  sidebarRight: {
    workspace: 'sidebar.right.workspace',
    inspectorViewport: 'sidebar.right.inspector-viewport',
    contextSwitch: (context: 'selection' | 'page') => `sidebar.right.switch-context.${context}`,
  },
  propPanel: {
    workspace: 'properties.workspace',
    heading: 'properties.heading',
    field: (fieldId: string) => `properties.field.${fieldId}`,
  },
  layerPanel: {
    heading: 'layers.heading',
  },
  historyPanel: {
    heading: 'history.heading',
  },
  pageInspector: {
    heading: 'page.heading',
  },
  createFile: {
    heading: 'create-file.heading',
  },
  templatePicker: {
    options: 'template-picker.options',
    details: 'template-picker.details',
    footer: 'template-picker.footer',
    optionCard: (presetId: string) => `template-picker.option.${presetId}`,
  },
}
