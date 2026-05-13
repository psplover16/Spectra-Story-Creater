import { describe, expect, it } from 'vitest'

import { detectRelationshipConflict } from '@/services/consistency/detectors/relationshipDetector'
import type { Character, Relationship } from '@/types/character'

function ch(id: string, name: string, relationships: Relationship[] = []): Character {
  return {
    id,
    name,
    personality: '',
    abilities: [],
    appearance: '',
    factionId: null,
    socialStatus: '',
    relationships,
    notes: '',
    createdAt: '',
    updatedAt: '',
  }
}

describe('detectRelationshipConflict', () => {
  it('positive：結拜兄弟卻被寫成仇敵 → 命中', () => {
    const source = ch('c1', '韋小寶', [
      { targetCharacterId: 'c2', kind: '結拜', description: '結拜兄弟' },
    ])
    const target = ch('c2', '茅十八')
    const result = detectRelationshipConflict({
      candidateResponse: '韋小寶與茅十八不共戴天',
      presentCharacters: [source, target],
      chapterId: 'ch1',
    })
    expect(result).toHaveLength(1)
    expect(result[0]?.category).toBe('relationship-conflict')
  })

  it('negative：盟友互動友好 → 不命中', () => {
    const source = ch('c1', '韋小寶', [
      { targetCharacterId: 'c2', kind: '結拜', description: '結拜兄弟' },
    ])
    const target = ch('c2', '茅十八')
    const result = detectRelationshipConflict({
      candidateResponse: '韋小寶與茅十八對飲',
      presentCharacters: [source, target],
      chapterId: 'ch1',
    })
    expect(result).toEqual([])
  })
})
