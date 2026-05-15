import { describe, expect, it } from 'vitest'

import { buildMembershipView } from '@/services/faction/membershipView'
import type { Character } from '@/types/character'

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

describe('buildMembershipView', () => {
  it('character.factionId 變動後成員列表即時反映', () => {
    const before = buildMembershipView('tdh', [ch('a', '韋小寶', 'tdh'), ch('b', '茅十八', 'tdh')])
    expect(before.memberCount).toBe(2)

    const after = buildMembershipView('tdh', [
      ch('a', '韋小寶', 'tdh'),
      ch('b', '茅十八', 'tdh'),
      ch('c', '吳六奇', 'tdh'),
    ])
    expect(after.memberCount).toBe(3)
  })
})
