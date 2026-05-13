import { describe, expect, it } from 'vitest'

import { diagnosticsToView } from '@/services/ai/contextDiagnostics'

describe('diagnosticsToView', () => {
  it('總被剔除等於 byBudget + bySize', () => {
    const view = diagnosticsToView({ skippedByBudget: ['s1', 's2'], skippedBySize: ['big'] })
    expect(view.totalSkipped).toBe(3)
    expect(view.skippedByBudget).toEqual(['s1', 's2'])
    expect(view.skippedBySize).toEqual(['big'])
  })
})
