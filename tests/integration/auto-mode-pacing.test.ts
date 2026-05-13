import { describe, expect, it } from 'vitest'

import { useAutoMode } from '@/composables/useAutoMode'

describe('integration: auto-mode pacing — 觀察輸入長度與頻率', () => {
  it('長 input → ghostwriter；短 input → companion；高頻短 input → companion', () => {
    const auto = useAutoMode()
    auto.observeInput('x'.repeat(120))
    expect(auto.decision.value).toBe('ghostwriter')

    auto.tickMinute()
    auto.observeInput('短')
    expect(auto.decision.value).toBe('companion')

    for (let i = 0; i < 5; i++) auto.observeInput('短')
    expect(auto.decision.value).toBe('companion')
  })
})
