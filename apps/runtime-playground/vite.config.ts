import {defineConfig} from 'vite'
import react, {reactCompilerPreset} from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import {createEditorViteConfig} from '@venus/editor-dev'

const sharedConfig = createEditorViteConfig({
  appConfigUrl: import.meta.url,
})

export default defineConfig({
  ...sharedConfig,
  plugins: [
    react(),
    tailwindcss(),
    babel({presets: [reactCompilerPreset()]}),
  ],
})
