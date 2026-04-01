import i18next, {
  changeLanguage,
  createInstance,
  dir,
  exists,
  getFixedT,
  hasLoadedNamespace,
  init,
  loadLanguages,
  loadNamespaces,
  loadResources,
  reloadResources,
  setDefaultNamespace,
  t,
  use,
} from '../../node_modules/i18next/dist/esm/i18next.js'

export default i18next

export {
  changeLanguage,
  createInstance,
  dir,
  exists,
  getFixedT,
  hasLoadedNamespace,
  init,
  loadLanguages,
  loadNamespaces,
  loadResources,
  reloadResources,
  setDefaultNamespace,
  t,
  use,
}

export const keyFromSelector = (selector) => {
  if (typeof selector === 'string') {
    return selector
  }

  return ''
}
