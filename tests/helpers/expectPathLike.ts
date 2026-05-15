function normalizePath(value: string): string {
  return value.replace(/\\/g, '/').replace(/\/+$/, '')
}

export function isPathLike(
  value: unknown,
  workspaceRoot: string,
  novelName: string,
): boolean {
  if (typeof value !== 'string') return false
  const root = normalizePath(workspaceRoot)
  const path = normalizePath(value)
  if (!path.startsWith(root + '/')) return false
  return path.endsWith('/' + novelName)
}

export interface AsymmetricPathLikeMatcher {
  asymmetricMatch(value: unknown): boolean
  toString(): string
  getExpectedType(): string
}

export function expectPathLike(
  workspaceRoot: string,
  novelName: string,
): AsymmetricPathLikeMatcher {
  return {
    asymmetricMatch(value: unknown): boolean {
      return isPathLike(value, workspaceRoot, novelName)
    },
    toString(): string {
      return `PathLike(root=${workspaceRoot}, novel=${novelName})`
    },
    getExpectedType(): string {
      return 'string'
    },
  }
}
