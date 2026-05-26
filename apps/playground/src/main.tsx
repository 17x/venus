import {REMOTE_SCENARIO_DEFINITIONS} from './demos/remoteScenarioCatalog'
import {tryMountRemoteScenarioPage} from './demos/remoteScenarioPage'
import {mountThreeEditorRuntime} from './runtime/threeEditor/mountThreeEditorRuntime'
import './index.css'

/**
 * Mounts the home route with cards linking to local runtime and remote scenario pages.
 */
const mountHomePage = (): void => {
  const root = document.getElementById('root')
  if (!root) {
    throw new Error('playground root element is missing')
  }

  const cards: Array<{title: string; description: string; link: string}> = [
    {
      title: '3D Editor Runtime',
      description: 'Engine-graph-first local runtime rebuilt with explicit command-state orchestration.',
      link: '#/3dEditor',
    },
    ...REMOTE_SCENARIO_DEFINITIONS.map((scenario) => ({
      title: scenario.title,
      description: scenario.summary,
      link: `#${scenario.path}`,
    })),
  ]

  root.innerHTML = `
    <div class="home-shell" data-playground-home="true">
      <header class="home-header">
        <h1 class="home-title">Venus Playground</h1>
        <p class="home-subtitle">Scenario Directory</p>
      </header>
      <main class="home-grid" id="home-grid"></main>
    </div>
  `

  const grid = root.querySelector<HTMLDivElement>('#home-grid')
  if (!grid) {
    throw new Error('playground home UI mount failed')
  }

  cards.forEach((card) => {
    const element = document.createElement('a')
    element.className = 'home-card-link-wrap'
    element.href = card.link
    element.innerHTML = `
      <article class="home-card">
        <h2 class="home-card-title">${card.title}</h2>
        <p class="home-card-description">${card.description}</p>
      </article>
    `
    grid.append(element)
  })
}

/**
 * Resolves normalized hash route path from current URL hash payload.
 */
const resolveHashSubRoutePath = (): string => {
  const rawHash = window.location.hash.startsWith('#')
    ? window.location.hash.slice(1)
    : window.location.hash
  if (!rawHash) {
    return ''
  }
  const hashPath = rawHash.split('?')[0]
  if (!hashPath) {
    return ''
  }
  return hashPath.startsWith('/') ? hashPath : `/${hashPath}`
}

/**
 * Removes hash query suffixes so route matching stays deterministic.
 */
const sanitizeHashRoute = (): void => {
  const rawHash = window.location.hash.startsWith('#')
    ? window.location.hash.slice(1)
    : window.location.hash
  if (!rawHash.includes('?')) {
    return
  }
  const hashPath = rawHash.split('?')[0]
  const normalizedHashPath = hashPath.startsWith('/') ? hashPath : `/${hashPath}`
  window.history.replaceState({}, '', `${window.location.pathname}${window.location.search}#${normalizedHashPath}`)
}

/**
 * Resolves whether current URL should mount the local runtime route.
 */
const shouldMountLocalPlayground = (): boolean => {
  const hashRoute = resolveHashSubRoutePath()
  if (hashRoute === '/3dEditor') {
    return true
  }

  const normalizedPath = window.location.pathname.endsWith('/') && window.location.pathname.length > 1
    ? window.location.pathname.slice(0, -1)
    : window.location.pathname
  if (normalizedPath === '/local' || normalizedPath === '/playground-local') {
    return true
  }

  const searchParams = new URLSearchParams(window.location.search)
  return searchParams.get('mode') === 'local'
}

/**
 * Boots the playground entrypoint and dispatches per-route page mounts.
 */
const bootstrapPlayground = async (): Promise<void> => {
  sanitizeHashRoute()
  const hashRoute = resolveHashSubRoutePath()
  if (!hashRoute || hashRoute === '/home') {
    mountHomePage()
    return
  }

  if (shouldMountLocalPlayground()) {
    mountThreeEditorRuntime()
    return
  }

  const mountedRemoteScenario = await tryMountRemoteScenarioPage()
  if (mountedRemoteScenario) {
    return
  }
  mountHomePage()
}

void bootstrapPlayground()

window.addEventListener('hashchange', () => {
  window.location.reload()
})
