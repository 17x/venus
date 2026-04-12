import {URL} from 'node:url'
import {defineConfig} from 'vite'
import react, {reactCompilerPreset} from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'

interface ViteAlias {
  find: string | RegExp
  replacement: string
}

function createWorkspaceAlias(find: string, relativePath: string, rootUrl: URL): ViteAlias {
  return {
    find,
    replacement: decodeURIComponent(new URL(relativePath, rootUrl).pathname),
  }
}

function createNodeModulesAlias(find: string, relativePath: string, appUrl: URL): ViteAlias {
  return {
    find,
    replacement: decodeURIComponent(new URL(relativePath, appUrl).pathname),
  }
}

const appUrl = new URL(import.meta.url)
const repoRootUrl = new URL('../../', appUrl)
const sharedAliases: ViteAlias[] = [
  createWorkspaceAlias('@venus/document-core', 'packages/document-core/src/index.ts', repoRootUrl),
  createWorkspaceAlias('@venus/engine', 'packages/engine/src/index.ts', repoRootUrl),
  createWorkspaceAlias('@venus/runtime/worker', 'packages/runtime/src/worker/index.ts', repoRootUrl),
  createWorkspaceAlias('@venus/file-format/base', 'packages/file-format/base/src/index.ts', repoRootUrl),
  createWorkspaceAlias('@venus/file-format', 'packages/file-format/src/index.ts', repoRootUrl),
  createWorkspaceAlias('@venus/runtime/interaction', 'packages/runtime/src/interaction/index.ts', repoRootUrl),
  createWorkspaceAlias('@venus/runtime/presets', 'packages/runtime/src/presets/index.ts', repoRootUrl),
  createWorkspaceAlias('@venus/runtime/presets/default', 'packages/runtime/src/presets/defaultEditorModules.ts', repoRootUrl),
  createWorkspaceAlias('@venus/runtime/presets/history', 'packages/runtime/src/presets/history.ts', repoRootUrl),
  createWorkspaceAlias('@venus/runtime/presets/protocol', 'packages/runtime/src/presets/protocol.ts', repoRootUrl),
  createWorkspaceAlias('@venus/runtime/presets/selection', 'packages/runtime/src/presets/selection.ts', repoRootUrl),
  createWorkspaceAlias('@venus/runtime/presets/snapping', 'packages/runtime/src/presets/snapping.ts', repoRootUrl),
  createWorkspaceAlias('@venus/runtime/react', 'packages/runtime/src/react/index.ts', repoRootUrl),
  createWorkspaceAlias('@venus/runtime', 'packages/runtime/src/index.ts', repoRootUrl),
  createWorkspaceAlias('@venus/shared-memory', 'packages/shared-memory/src/index.ts', repoRootUrl),
  createWorkspaceAlias('@venus/ui', 'packages/ui/src/index.ts', repoRootUrl),
  createWorkspaceAlias('@venus/ui/components', 'packages/ui/src/components', repoRootUrl),
  createWorkspaceAlias('@venus/ui/hooks', 'packages/ui/src/hooks', repoRootUrl),
  createWorkspaceAlias('@venus/ui/lib', 'packages/ui/src/lib', repoRootUrl),
  createNodeModulesAlias('react/compiler-runtime', './node_modules/react/compiler-runtime.js', appUrl),
  createNodeModulesAlias('react/jsx-runtime', './node_modules/react/jsx-runtime.js', appUrl),
  createNodeModulesAlias('react-dom/client', './node_modules/react-dom/client.js', appUrl),
]

export default defineConfig({
  base: './',
  resolve: {
    alias: [...sharedAliases],
  },
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  preview: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    babel({presets: [reactCompilerPreset()]}),
  ],
})
