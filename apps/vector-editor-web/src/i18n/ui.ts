import {useTranslation} from 'react-i18next'

export const VECTOR_LANGUAGE_CODES = ['en', 'cn', 'jp'] as const

export type VectorLanguageCode = typeof VECTOR_LANGUAGE_CODES[number]

const VECTOR_LANGUAGE_LABELS: Record<VectorLanguageCode, string> = {
  en: 'English',
  cn: '中文',
  jp: '日本語',
}

export function resolveVectorLanguageCode(language?: string): VectorLanguageCode {
  const normalized = language?.toLowerCase()
  if (normalized === 'zh-cn' || normalized === 'zh') {
    return 'cn'
  }
  if (normalized && VECTOR_LANGUAGE_CODES.includes(normalized as VectorLanguageCode)) {
    return normalized as VectorLanguageCode
  }

  const shortCode = normalized?.split('-')[0]
  if (shortCode && VECTOR_LANGUAGE_CODES.includes(shortCode as VectorLanguageCode)) {
    return shortCode as VectorLanguageCode
  }

  return 'en'
}

export function resolveVectorLanguageLabel(language: VectorLanguageCode) {
  return VECTOR_LANGUAGE_LABELS[language]
}

export function useVectorUiI18n() {
  const {i18n, t} = useTranslation()
  const language = resolveVectorLanguageCode(i18n.resolvedLanguage ?? i18n.language)

  const changeLanguage = (nextLanguage: VectorLanguageCode) => {
    const resolvedLanguage = nextLanguage === 'cn' ? 'zh-CN' : nextLanguage
    return i18n.changeLanguage(resolvedLanguage)
  }

  return {
    language,
    languages: VECTOR_LANGUAGE_CODES,
    getLanguageLabel: resolveVectorLanguageLabel,
    tUi: (key: string) => t(`ui.${key}`),
    changeLanguage,
  }
}
