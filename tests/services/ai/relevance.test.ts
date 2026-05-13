import { describe, expect, it } from 'vitest'

import { scoreRelevance } from '@/services/ai/relevance'

describe('scoreRelevance 三規則', () => {
  it('keyword overlap：每個重疊關鍵字 +2', () => {
    const score = scoreRelevance(
      { keywords: ['揚州', '街頭'], factionId: null, isPresent: false },
      { chapterKeywords: ['揚州', '麗春院'], presentFactionIds: new Set() },
    )
    expect(score).toBe(2)
  })

  it('faction proximity：所屬陣營在場 +3', () => {
    const score = scoreRelevance(
      { keywords: [], factionId: 'tdh', isPresent: false },
      { chapterKeywords: [], presentFactionIds: new Set(['tdh']) },
    )
    expect(score).toBe(3)
  })

  it('present-characters：在場 +5，組合三規則', () => {
    const score = scoreRelevance(
      { keywords: ['韋小寶'], factionId: 'tdh', isPresent: true },
      { chapterKeywords: ['韋小寶'], presentFactionIds: new Set(['tdh']) },
    )
    expect(score).toBe(2 + 3 + 5)
  })
})
