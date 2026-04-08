import {useTranslation} from 'react-i18next'

export const VECTOR_LANGUAGE_CODES = ['en', 'cn', 'jp'] as const

export type VectorLanguageCode = typeof VECTOR_LANGUAGE_CODES[number]

const VECTOR_LANGUAGE_LABELS: Record<VectorLanguageCode, string> = {
  en: 'English',
  cn: '中文',
  jp: '日本語',
}

export function resolveVectorLanguageCode(language?: string): VectorLanguageCode {
  const normalized = language?.split('-')[0]
  if (normalized && VECTOR_LANGUAGE_CODES.includes(normalized as VectorLanguageCode)) {
    return normalized as VectorLanguageCode
  }
  return 'en'
}

export function resolveVectorLanguageLabel(language: VectorLanguageCode) {
  return VECTOR_LANGUAGE_LABELS[language]
}

export function useVectorUiI18n() {
  const {i18n, t} = useTranslation()
  const language = resolveVectorLanguageCode(i18n.resolvedLanguage ?? i18n.language)

  return {
    language,
    languages: VECTOR_LANGUAGE_CODES,
    getLanguageLabel: resolveVectorLanguageLabel,
    tUi: (key: string) => t(`ui.${key}`),
    changeLanguage: (nextLanguage: VectorLanguageCode) => i18n.changeLanguage(nextLanguage),
  }
}
