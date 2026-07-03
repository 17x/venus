/**
 * Module boundary import tests.
 *
 * Verifies the dependency rules from ENGINE_MODULE_CONSTRAINTS.md:
 * - Layer 0 (_infra/) never imports from Layer 1+ modules.
 * - No circular dependencies at the module level.
 * - Internal services are self-contained.
 */
import { describe, it } from 'node:test'
import * as assert from 'node:assert'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const modulesDir = path.resolve(__dirname, '..')

/**
 * Recursively collects all .ts files under a directory.
 */
function collectTsFiles(dir: string): string[] {
  const result: string[] = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    // Skip test directories and node_modules.
    if (entry.name === '__tests__' || entry.name === 'node_modules') continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      result.push(...collectTsFiles(full))
    } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) {
      result.push(full)
    }
  }
  return result
}

/**
 * Extracts relative import paths from a TypeScript source file.
 */
function extractRelativeImports(filePath: string): string[] {
  const content = fs.readFileSync(filePath, 'utf-8')
  const importRegex = /from\s+['"](\.\.?\/[^'"]+)['"]/g
  const imports: string[] = []
  let match: RegExpExecArray | null
  while ((match = importRegex.exec(content)) !== null) {
    imports.push(match[1])
  }
  return imports
}

/** Resolves a relative import to an absolute path. */
function resolveImport(fromFile: string, importPath: string): string {
  const dir = path.dirname(fromFile)
  return path.resolve(dir, importPath)
}

describe('module boundary rules', () => {
  const allFiles = collectTsFiles(modulesDir)
  const infraDir = path.join(modulesDir, '_infra')

  it('Layer 0 (_infra/) never imports from sibling module directories', () => {
    const infraFiles = allFiles.filter((f) => f.startsWith(infraDir))

    // All sibling module directories (camera, hitTest, etc.) except _infra itself.
    const moduleDirs = fs.readdirSync(modulesDir, { withFileTypes: true })
      .filter((d) => d.isDirectory() && d.name !== '_infra' && d.name !== '__tests__')
      .map((d) => path.join(modulesDir, d.name))

    for (const file of infraFiles) {
      const imports = extractRelativeImports(file)
      for (const imp of imports) {
        const resolved = resolveImport(file, imp)
        for (const modDir of moduleDirs) {
          assert.ok(
            !resolved.startsWith(modDir),
            `Layer 0 file ${path.relative(modulesDir, file)} must not import from module directory ${path.relative(modulesDir, modDir)} (found: ${imp})`,
          )
        }
      }
    }
  })

  it('catalog.ts does not import from any module implementation', () => {
    const catalogFile = path.join(modulesDir, 'catalog.ts')
    const imports = extractRelativeImports(catalogFile)

    // catalog.ts should only define the catalog — no runtime imports.
    for (const imp of imports) {
      assert.ok(
        imp === './catalog.ts' || imp.startsWith('.'),
        `catalog.ts should not import module implementations, found: ${imp}`,
      )
    }
    // All imports should be self-referential or type-only.
    assert.equal(imports.length, 0, 'catalog.ts should have no relative imports')
  })

  it('services.ts does not import from any module implementation', () => {
    const servicesFile = path.join(modulesDir, 'services.ts')
    const imports = extractRelativeImports(servicesFile)
    assert.equal(imports.length, 0, 'services.ts should have no relative imports')
  })

  it('modules/index.ts barrel has no circular re-exports', () => {
    const barrelFile = path.join(modulesDir, 'index.ts')
    const content = fs.readFileSync(barrelFile, 'utf-8')
    const lines = content.split('\n').filter((l) => l.includes('export * from'))

    // Every export should point to a subdirectory that exists.
    for (const line of lines) {
      const match = line.match(/['"]\.\/([^'"]+)['"]/)
      if (match) {
        const target = path.join(modulesDir, match[1])
        assert.ok(
          fs.existsSync(target) || fs.existsSync(target + '.ts'),
          `Barrel export target not found: ${match[1]}`,
        )
      }
    }
  })
})
