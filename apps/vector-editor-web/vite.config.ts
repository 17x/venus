import {fileURLToPath, URL} from 'node:url'
import {defineConfig} from 'vite'
import react, {reactCompilerPreset} from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import {createEditorViteConfig} from '@venus/editor-dev'

const sharedConfig = createEditorViteConfig({
  appConfigUrl: import.meta.url,
  aliases: [
    {find: 'i18next', replacement: fileURLToPath(new URL('./src/shims/i18next.js', import.meta.url))},
    // {find: '@lite-u/editor', replacement: fileURLToPath(new URL('../../packages/editor_old/index.ts', import.meta.url))},
    // {find: '@lite-u/editor/types', replacement: fileURLToPath(new URL('../../packages/editor_old/type.ts', import.meta.url))},
    // {find: '~', replacement: fileURLToPath(new URL('../../packages/editor_old', import.meta.url))},
  ],
})

export default defineConfig({
  ...sharedConfig,
  plugins: [
    react(),
    tailwindcss(),
    babel({presets: [reactCompilerPreset()]}),
  ],
})
