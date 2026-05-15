import { describe, expect, it } from 'vitest'

import { detectPersonalityDrift } from '@/services/evolution/personalityDetector'
import type { Character } from '@/types/character'

function ch(personality: string): Character {
  return {
    id: 'c1',
    name: '韋小寶',
    personality,
    abilities: [],
    appearance: '',
    factionIds: [],
    socialStatus: '',
    relationships: [],
    notes: '',
    equipment: [],
    createdAt: '',
    updatedAt: '',
  }
}

describe('detectPersonalityDrift', () => {
  it('positive：性格寫「市井狡黠」回應出現「捨命相護」 → 偵測到 drift', () => {
    const finding = detectPersonalityDrift({
      character: ch('市井狡黠'),
      candidateResponse: '韋小寶為了茅十八捨命相護',
      chapterId: 'ch1',
    })
    expect(finding).not.toBeNull()
    expect(finding?.evidence).toContain('市井狡黠')
    expect(finding?.evidence).toContain('捨命相護')
  })

  it('negative：無偏移 → 不偵測', () => {
    const finding = detectPersonalityDrift({
      character: ch('市井狡黠'),
      candidateResponse: '韋小寶嘻嘻哈哈混過街頭',
      chapterId: 'ch1',
    })
    expect(finding).toBeNull()
  })
})
