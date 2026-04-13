import {fileURLToPath} from 'node:url'
import {defineConfig} from 'vite'
import react, {reactCompilerPreset} from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: './',
  resolve: {
    alias: [
      {find: 'i18next', replacement: fileURLToPath(new URL('./src/shims/i18next.js', import.meta.url))},
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
  ],
})
