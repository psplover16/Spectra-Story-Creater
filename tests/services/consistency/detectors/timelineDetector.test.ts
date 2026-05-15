import { describe, expect, it } from 'vitest'

import { detectTimelineConflict } from '@/services/consistency/detectors/timelineDetector'
import type { Character } from '@/types/character'

function ch(id: string, name: string): Character {
  return {
    id,
    name,
    personality: '',
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

describe('detectTimelineConflict', () => {
  it('positive：已死角色出現於候選回應 → 命中', () => {
    const result = detectTimelineConflict({
      candidateResponse: '茅十八緩緩開口',
      presentCharacters: [ch('c1', '茅十八')],
      deceasedCharacterIds: ['c1'],
      chapterId: 'ch1',
    })
    expect(result).toHaveLength(1)
    expect(result[0]?.category).toBe('timeline-conflict')
  })

  it('negative：未死角色出現 → 不命中', () => {
    const result = detectTimelineConflict({
      candidateResponse: '茅十八緩緩開口',
      presentCharacters: [ch('c1', '茅十八')],
      deceasedCharacterIds: [],
      chapterId: 'ch1',
    })
    expect(result).toEqual([])
  })
})
