import { describe, expect, it } from 'vitest'

import { detectWorldviewConflict } from '@/services/consistency/detectors/worldviewDetector'

describe('detectWorldviewConflict', () => {
  it('positive：古代背景中出現現代詞「手機」 → 命中', () => {
    const result = detectWorldviewConflict({
      candidateResponse: '韋小寶掏出手機',
      worldview: [{ id: 'w1', title: '清初江湖', content: '清初年間，江湖混亂' }],
      chapterId: 'ch1',
    })
    expect(result).toHaveLength(1)
    expect(result[0]?.category).toBe('worldview-conflict')
  })

  it('negative：背景非古代且無現代詞 → 不命中', () => {
    const result = detectWorldviewConflict({
      candidateResponse: '韋小寶掏出短刀',
      worldview: [{ id: 'w1', title: '現代背景', content: '都會生活' }],
      chapterId: 'ch1',
    })
    expect(result).toEqual([])
  })
})
