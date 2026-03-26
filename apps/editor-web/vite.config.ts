import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      '@venus/editor-core': fileURLToPath(new URL('../../packages/editor-core/src/index.ts', import.meta.url)),
      '@venus/editor-ui': fileURLToPath(new URL('../../packages/editor-ui/src/index.tsx', import.meta.url)),
      '@venus/editor-worker': fileURLToPath(new URL('../../packages/editor-worker/src/index.ts', import.meta.url)),
      '@venus/renderer-skia': fileURLToPath(new URL('../../packages/renderer-skia/src/index.tsx', import.meta.url)),
      '@venus/shared-memory': fileURLToPath(new URL('../../packages/shared-memory/src/index.ts', import.meta.url)),
      '@venus/ui': fileURLToPath(new URL('../../packages/ui/src/index.ts', import.meta.url)),
    },
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
