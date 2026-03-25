import js from '@eslint/js'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    ignores: ['**/dist/**', '**/node_modules/**', '**/.turbo/**'],
  },
  {
    files: [
      'apps/editor-web/src/App.tsx',
      'apps/editor-web/src/main.tsx',
      'apps/editor-web/src/editor.worker.ts',
      'apps/editor-web/src/hooks/useEditorRuntime.ts',
      'packages/editor-core/src/**/*.{ts,tsx}',
      'packages/editor-ui/src/**/*.{ts,tsx}',
      'packages/editor-worker/src/**/*.{ts,tsx}',
      'packages/renderer-skia/src/**/*.{ts,tsx}',
      'packages/shared-memory/src/**/*.{ts,tsx}',
      'packages/ui/src/**/*.{ts,tsx}',
    ],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2020,
      globals: {
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        self: 'readonly',
        DedicatedWorkerGlobalScope: 'readonly',
        SharedArrayBuffer: 'readonly',
        crossOriginIsolated: 'readonly',
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      semi: ['error', 'never'],
      '@typescript-eslint/ban-ts-comment': [
        'error',
        {
          'ts-check': true,
          'ts-expect-error': false,
          'ts-ignore': false,
          'ts-nocheck': false,
        },
      ],
    },
  },
)
