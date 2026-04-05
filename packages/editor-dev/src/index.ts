export interface EditorViteAlias {
  find: string | RegExp
  replacement: string
}

export interface CreateEditorViteConfigOptions {
  appConfigUrl: string
  aliases?: EditorViteAlias[]
}

function createWorkspaceAlias(
  find: string,
  relativePath: string,
  rootUrl: URL,
): EditorViteAlias {
  return {
    find,
    replacement: decodeURIComponent(new URL(relativePath, rootUrl).pathname),
  }
}

function createNodeModulesAlias(
  find: string,
  relativePath: string,
  appUrl: URL,
): EditorViteAlias {
  return {
    find,
    replacement: decodeURIComponent(new URL(relativePath, appUrl).pathname),
  }
}

export function createEditorViteConfig(options: CreateEditorViteConfigOptions) {
  const appUrl = new URL(options.appConfigUrl)
  const repoRootUrl = new URL('../../', appUrl)

  const sharedAliases: EditorViteAlias[] = [
    createWorkspaceAlias('@venus/canvas-base', 'packages/canvas-base/src/index.ts', repoRootUrl),
    createWorkspaceAlias('@venus/document-core', 'packages/document-core/src/index.ts', repoRootUrl),
    createWorkspaceAlias('@venus/editor-dev', 'packages/editor-dev/src/index.ts', repoRootUrl),
    createWorkspaceAlias('@venus/editor-product', 'packages/editor-product/src/index.ts', repoRootUrl),
    createWorkspaceAlias('@venus/editor-worker', 'packages/editor-worker/src/index.ts', repoRootUrl),
    createWorkspaceAlias('@venus/file-format/base', 'packages/file-format/base/src/index.ts', repoRootUrl),
    createWorkspaceAlias('@venus/file-format', 'packages/file-format/src/index.ts', repoRootUrl),
    createWorkspaceAlias('@venus/renderer-skia', 'packages/renderer-skia/src/index.tsx', repoRootUrl),
    createWorkspaceAlias('@venus/shared-memory', 'packages/shared-memory/src/index.ts', repoRootUrl),
    createWorkspaceAlias('@venus/spatial-index', 'packages/spatial-index/src/index.ts', repoRootUrl),
    createWorkspaceAlias('@venus/ui', 'packages/ui/src/index.ts', repoRootUrl),
    createNodeModulesAlias('react/compiler-runtime', './node_modules/react/compiler-runtime.js', appUrl),
    createNodeModulesAlias('react/jsx-runtime', './node_modules/react/jsx-runtime.js', appUrl),
    createNodeModulesAlias('react-dom/client', './node_modules/react-dom/client.js', appUrl),
  ]

  return {
    base: './',
    resolve: {
      alias: [...(options.aliases ?? []), ...sharedAliases],
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
  }
}
