import { describe, expect, it } from 'vitest'

import { buildFactionSummarySlices } from '@/services/faction/factionSummarySlice'
import type { Character } from '@/types/character'
import type { Faction } from '@/types/faction'

function ch(id: string, factionId: string | null): Character {
  return {
    id,
    name: `c-${id}`,
    personality: '',
    abilities: [],
    appearance: '',
    factionId,
    socialStatus: '',
    relationships: [],
    notes: '',
    createdAt: '',
    updatedAt: '',
  }
}

function f(id: string): Faction {
  return {
    id,
    name: `f-${id}`,
    alignment: 'neutral',
    description: '',
    currentSituation: '',
    keyMembers: [],
    createdAt: '',
    updatedAt: '',
  }
}

describe('integration: factionSummarySlice 進入 ai-context', () => {
  it('當前章節 present characters 所屬 faction 才被納入 slice', () => {
    const slices = buildFactionSummarySlices(
      [ch('a', 'tdh'), ch('b', 'court')],
      [f('tdh'), f('court'), f('rebels')],
    )
    expect(slices.map((s) => s.factionId).sort()).toEqual(['court', 'tdh'])
    expect(slices.find((s) => s.factionId === 'rebels')).toBeUndefined()
  })
})
