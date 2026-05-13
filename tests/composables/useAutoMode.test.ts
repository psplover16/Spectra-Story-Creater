import { describe, expect, it } from 'vitest'

import { useAutoMode } from '@/composables/useAutoMode'

describe('useAutoMode', () => {
  it('觀察長 input → decision 切到 ghostwriter；tickMinute 清零頻率後仍按長度', () => {
    const auto = useAutoMode()
    auto.observeInput('x'.repeat(120))
    expect(auto.decision.value).toBe('ghostwriter')
    auto.tickMinute()
    expect(auto.decision.value).toBe('ghostwriter')
  })

  it('短 input → decision=companion', () => {
    const auto = useAutoMode()
    auto.observeInput('短')
    expect(auto.decision.value).toBe('companion')
  })
})
