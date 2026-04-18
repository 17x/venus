import i18n from "i18next"
import {initReactI18next} from "react-i18next"
import enMenu from './en/menu.json'
import enHistory from './en/history.json'
import enFile from './en/file.json'
import enMisc from './en/misc.json'
import enUi from './en/ui.json'
import enEditorSemantic from './locales/en/editor.json'
import cnMenu from './cn/menu.json'
import cnHistory from './cn/history.json'
import cnUi from './cn/ui.json'
import zhCnEditorSemantic from './locales/zh-CN/editor.json'
import jpMenu from './jp/menu.json'
import jpHistory from './jp/history.json'
import jpUi from './jp/ui.json'

const VECTOR_LANGUAGE_STORAGE_KEY = 'venus.vector.language'

const resources = {
  en: {
    translation: {
      ...enMenu,
      ...enHistory,
      ...enFile,
      ...enMisc,
      ...enUi,
      ...enEditorSemantic,
    }
  },
  cn: {
    translation: {
      ...cnMenu,
      ...cnHistory,
      ...cnUi,
      ...zhCnEditorSemantic,
    }
  },
  'zh-CN': {
    translation: {
      ...cnMenu,
      ...cnHistory,
      ...cnUi,
      ...zhCnEditorSemantic,
    }
  },
  jp: {
    translation: {
      ...jpMenu,
      ...jpHistory,
      ...jpUi,
    }
  }
}

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: typeof window === 'undefined'
      ? 'en'
      : (window.localStorage.getItem(VECTOR_LANGUAGE_STORAGE_KEY) ?? 'en'),
    fallbackLng: "en",
    supportedLngs: ['en', 'cn', 'zh-CN', 'jp'],
    // returnObject: true,
    interpolation: {
      escapeValue: false
    }
  })

i18n.on('languageChanged', (nextLanguage) => {
  if (typeof window === 'undefined') {
    return
  }
  window.localStorage.setItem(VECTOR_LANGUAGE_STORAGE_KEY, nextLanguage)
})

export default i18n
