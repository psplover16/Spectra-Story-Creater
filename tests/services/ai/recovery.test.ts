import { describe, expect, it } from 'vitest'

import { decideRecovery } from '@/services/ai/recovery'

describe('decideRecovery 三路徑', () => {
  it('retry 直接回 retry', async () => {
    const r = await decideRecovery(
      { failedSource: 'codex', attemptsSoFar: 1, triedSources: new Set(['codex']) },
      { prompt: async () => 'retry' },
    )
    expect(r.action).toBe('retry')
  })

  it('switch 回 nextSource=未試過的 source', async () => {
    const r = await decideRecovery(
      { failedSource: 'codex', attemptsSoFar: 1, triedSources: new Set(['codex']) },
      { prompt: async () => 'switch' },
    )
    expect(r.action).toBe('switch')
    expect(r.nextSource).toBe('claude')
  })

  it('cancel 直接回 cancel', async () => {
    const r = await decideRecovery(
      { failedSource: 'codex', attemptsSoFar: 1, triedSources: new Set(['codex']) },
      { prompt: async () => 'cancel' },
    )
    expect(r.action).toBe('cancel')
  })
})
