import { describe, expect, it } from 'vitest'

import { buildFactionSummarySlices } from '@/services/faction/factionSummarySlice'
import type { Character } from '@/types/character'
import type { Faction } from '@/types/faction'

function ch(id: string, name: string, factionId: string | null): Character {
  return {
    id,
    name,
    personality: '',
    abilities: [],
    appearance: '',
    factionIds: factionId === null ? [] : [factionId],
    socialStatus: '',
    relationships: [],
    notes: '',
    equipment: [],
    createdAt: '',
    updatedAt: '',
  }
}

function f(id: string, name: string): Faction {
  return {
    id,
    name,
    alignment: 'neutral',
    description: '',
    currentSituation: '',
    keyMembers: [],
    createdAt: '',
    updatedAt: '',
  }
}

describe('buildFactionSummarySlices', () => {
  it('只取 presentCharacters 所屬 faction', () => {
    const slices = buildFactionSummarySlices(
      [ch('c1', '韋小寶', 'tdh'), ch('c2', '康熙', 'court')],
      [f('tdh', '天地會'), f('court', '清廷'), f('rebels', '反賊')],
    )
    const names = slices.map((s) => s.name).sort()
    expect(names).toEqual(['天地會', '清廷'])
  })
})
