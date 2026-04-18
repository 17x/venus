const FORBIDDEN_IMPORT_PREFIXES = ['@venus/engine']

const SHELL_OWNERSHIP_RULES = {
  appLayer: 'Owns shell UI orchestration and command dispatch',
  runtimeLayer: 'Owns interaction policy and worker bridge',
  engineLayer: 'Owns render/hit-test/math mechanism only',
}

export function validateShellImportPath(importPath: string) {
  return !FORBIDDEN_IMPORT_PREFIXES.some((prefix) => importPath.startsWith(prefix))
}

export function getShellBoundaryRules() {
  return {
    forbiddenPrefixes: [...FORBIDDEN_IMPORT_PREFIXES],
    ownership: {...SHELL_OWNERSHIP_RULES},
  }
}
