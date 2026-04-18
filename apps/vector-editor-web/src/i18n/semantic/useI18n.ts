import {useTranslation} from 'react-i18next'
import type {EditorI18nKey} from './types.ts'

interface TranslateOptions {
  fallback?: string
  values?: Record<string, unknown>
}

export function useI18n() {
  const {t, i18n} = useTranslation()

  function tKey(key: EditorI18nKey, options?: TranslateOptions) {
    const hasKey = i18n.exists(key)
    if (!hasKey) {
      return options?.fallback ?? key
    }

    return t(key, {
      defaultValue: options?.fallback ?? key,
      ...(options?.values ?? {}),
    })
  }

  return {
    tKey,
  }
}
