import { describe, expect, it } from 'vitest'

import { checkSelfContained } from '@/services/export/selfContainedChecker'

describe('selfContainedChecker', () => {
  it('通過：內嵌 style + 無外部 src/href', () => {
    const html = `<!doctype html><html><head><style>body{}</style></head><body></body></html>`
    const result = checkSelfContained(html)
    expect(result.isSelfContained).toBe(true)
    expect(result.violations).toEqual([])
  })

  it('失敗：含 <link href="https://cdn..."> 列入 violations', () => {
    const html = `<!doctype html><html><head><link rel="stylesheet" href="https://cdn.example.com/x.css" /></head><body></body></html>`
    const result = checkSelfContained(html)
    expect(result.isSelfContained).toBe(false)
    expect(result.violations[0]).toContain('href')
  })
})
