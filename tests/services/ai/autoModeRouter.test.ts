import { describe, expect, it } from 'vitest'

import { decideAutoMode } from '@/services/ai/autoModeRouter'

describe('autoModeRouter 三案例', () => {
  it('長 input（>=80）→ 偏代筆', () => {
    expect(decideAutoMode({ lastInputLength: 120, recentInteractionCount: 1 })).toBe('ghostwriter')
  })

  it('短 input（<30）→ 偏陪寫', () => {
    expect(decideAutoMode({ lastInputLength: 12, recentInteractionCount: 1 })).toBe('companion')
  })

  it('高頻短 input → 維持陪寫', () => {
    expect(decideAutoMode({ lastInputLength: 12, recentInteractionCount: 6 })).toBe('companion')
  })
})
