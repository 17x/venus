import i18n from "i18next"
import {initReactI18next} from "react-i18next"
import enMenu from './en/menu.json'
import enHistory from './en/history.json'
import enFile from './en/file.json'
import enMisc from './en/misc.json'
import cnMenu from './cn/menu.json'
import cnHistory from './cn/history.json'
import jpMenu from './jp/menu.json'
import jpHistory from './jp/history.json'

const resources = {
  en: {
    translation: {
      ...enMenu,
      ...enHistory,
      ...enFile,
      ...enMisc
    }
  },
  cn: {
    translation: {
      ...cnMenu,
      ...cnHistory,
    }
  },
  jp: {
    translation: {
      ...jpMenu,
      ...jpHistory,
    }
  }
}

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: "en",
    fallbackLng: "en",
    // returnObject: true,
    interpolation: {
      escapeValue: false
    }
  })

export default i18n