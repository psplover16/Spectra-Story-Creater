import { describe, expect, it } from 'vitest'

import { detectUnexplainedAbility } from '@/services/consistency/detectors/abilityDetector'
import type { Character } from '@/types/character'

function ch(id: string, name: string, abilities: string[]): Character {
  return {
    id,
    name,
    personality: '',
    abilities,
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

describe('detectUnexplainedAbility', () => {
  it('positive：角色未登錄輕功卻被描寫使用 → 命中', () => {
    const result = detectUnexplainedAbility({
      candidateResponse: '韋小寶展開輕功躍上屋頂',
      presentCharacters: [ch('c1', '韋小寶', ['口才'])],
      chapterId: 'ch1',
    })
    expect(result).toHaveLength(1)
    expect(result[0]?.category).toBe('unexplained-ability')
  })

  it('negative：角色已登錄輕功 → 不命中', () => {
    const result = detectUnexplainedAbility({
      candidateResponse: '韋小寶展開輕功躍上屋頂',
      presentCharacters: [ch('c1', '韋小寶', ['輕功小成'])],
      chapterId: 'ch1',
    })
    expect(result).toEqual([])
  })
})
