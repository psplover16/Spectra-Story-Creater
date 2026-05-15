import { describe, expect, it } from 'vitest'

import { detectOoc } from '@/services/consistency/detectors/oocDetector'
import type { Character } from '@/types/character'

function ch(id: string, name: string, personality: string): Character {
  return {
    id,
    name,
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

describe('detectOoc', () => {
  it('positive：寡言角色出現大喊 → 命中 OOC', () => {
    const result = detectOoc({
      candidateResponse: '韋小寶大喊一聲',
      presentCharacters: [ch('c1', '韋小寶', '沉默寡言')],
      chapterId: 'ch1',
    })
    expect(result).toHaveLength(1)
    expect(result[0]?.category).toBe('ooc')
  })

  it('negative：機靈角色出現大喊 → 不命中（個性不衝突）', () => {
    const result = detectOoc({
      candidateResponse: '韋小寶大喊一聲',
      presentCharacters: [ch('c1', '韋小寶', '機靈狡黠')],
      chapterId: 'ch1',
    })
    expect(result).toEqual([])
  })
})
