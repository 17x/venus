import enEditorLocale from '../locales/en/editor.json'

type DeepKeyOf<T extends Record<string, unknown>> = {
  [K in keyof T & string]: T[K] extends Record<string, unknown>
    ? `${K}` | `${K}.${DeepKeyOf<T[K]>}`
    : `${K}`
}[keyof T & string]

export type EditorI18nKey = DeepKeyOf<typeof enEditorLocale>
