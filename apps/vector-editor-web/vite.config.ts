import {fileURLToPath} from 'node:url'
import {defineConfig} from 'vite'
import react, {reactCompilerPreset} from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import { analyzer } from 'vite-bundle-analyzer'

export default defineConfig({
  base: './',
  resolve: {
    alias: [
      {find: '@', replacement: fileURLToPath(new URL('./src', import.meta.url))},
      {find: 'i18next', replacement: fileURLToPath(new URL('./src/shims/i18next.js', import.meta.url))},
      {find: '@vector/ui', replacement: fileURLToPath(new URL('./src/ui/index.ts', import.meta.url))},
      {find: '@vector/runtime/worker', replacement: fileURLToPath(new URL('./src/editor/runtime-local/worker/index.ts', import.meta.url))},
      {find: '@vector/runtime/interaction', replacement: fileURLToPath(new URL('./src/editor/runtime-local/interaction/index.ts', import.meta.url))},
      {find: '@vector/runtime/presets', replacement: fileURLToPath(new URL('./src/editor/runtime-local/presets/index.ts', import.meta.url))},
      {find: '@vector/runtime/engine', replacement: fileURLToPath(new URL('./src/editor/runtime-local/engine.ts', import.meta.url))},
      {find: '@vector/runtime/shared-memory', replacement: fileURLToPath(new URL('./src/editor/runtime-local/shared-memory/index.ts', import.meta.url))},
      {find: '@vector/runtime', replacement: fileURLToPath(new URL('./src/editor/runtime-local/index.ts', import.meta.url))},
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
    react(),
    tailwindcss(),
    babel({presets: [reactCompilerPreset()]}),
    analyzer()
  ],
})
