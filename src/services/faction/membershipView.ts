import type { Character } from '@/types/character'

export interface FactionMembershipView {
  factionId: string
  memberCount: number
  members: Array<{ characterId: string; name: string }>
}

export function buildMembershipView(
  factionId: string,
  characters: Character[],
): FactionMembershipView {
  const members = characters.filter((c) => c.factionId === factionId)
  return {
    factionId,
    memberCount: members.length,
    members: members.map((c) => ({ characterId: c.id, name: c.name })),
  }
}
