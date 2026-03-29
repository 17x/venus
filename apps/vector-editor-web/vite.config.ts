import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  resolve: {
    alias: [
      { find: '@venus/canvas-base', replacement: fileURLToPath(new URL('../../packages/canvas-base/src/index.ts', import.meta.url)) },
      { find: '@venus/collaboration', replacement: fileURLToPath(new URL('../../packages/collaboration/src/index.ts', import.meta.url)) },
      { find: '@venus/editor-core', replacement: fileURLToPath(new URL('../../packages/editor-core/src/index.ts', import.meta.url)) },
      { find: '@venus/editor-ui', replacement: fileURLToPath(new URL('../../packages/editor-ui/src/index.tsx', import.meta.url)) },
      { find: '@venus/editor-worker', replacement: fileURLToPath(new URL('../../packages/editor-worker/src/index.ts', import.meta.url)) },
      { find: '@venus/history', replacement: fileURLToPath(new URL('../../packages/history/src/index.ts', import.meta.url)) },
      { find: '@venus/renderer-skia', replacement: fileURLToPath(new URL('../../packages/renderer-skia/src/index.tsx', import.meta.url)) },
      { find: '@venus/shared-memory', replacement: fileURLToPath(new URL('../../packages/shared-memory/src/index.ts', import.meta.url)) },
      { find: '@venus/spatial-index', replacement: fileURLToPath(new URL('../../packages/spatial-index/src/index.ts', import.meta.url)) },
      { find: '@venus/ui', replacement: fileURLToPath(new URL('../../packages/ui/src/index.ts', import.meta.url)) },
      { find: 'react/compiler-runtime', replacement: fileURLToPath(new URL('./node_modules/react/compiler-runtime.js', import.meta.url)) },
      { find: 'react/jsx-runtime', replacement: fileURLToPath(new URL('./node_modules/react/jsx-runtime.js', import.meta.url)) },
      { find: 'react-dom/client', replacement: fileURLToPath(new URL('./node_modules/react-dom/client.js', import.meta.url)) },
    ],
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
    tailwindcss(),
    react(),
    babel({ presets: [reactCompilerPreset()] }),
  ],
})
