const EXTERNAL_PATTERNS = [
  /<link[^>]+href=["']https?:/i,
  /<script[^>]+src=["']https?:/i,
  /<img[^>]+src=["']https?:/i,
  /@import\s+url\(["']?https?:/i,
]

export interface SelfContainedResult {
  isSelfContained: boolean
  violations: string[]
}

export function checkSelfContained(html: string): SelfContainedResult {
  const violations: string[] = []
  for (const pattern of EXTERNAL_PATTERNS) {
    const match = html.match(pattern)
    if (match) {
      violations.push(match[0])
    }
  }
  return {
    isSelfContained: violations.length === 0,
    violations,
  }
}
