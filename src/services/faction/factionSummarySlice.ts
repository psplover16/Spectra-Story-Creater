import type { Character } from '@/types/character'
import type { Faction } from '@/types/faction'
import type { FactionSummarySlice } from '@/types/ai'

export function buildFactionSummarySlices(
  presentCharacters: Character[],
  factions: Faction[],
): FactionSummarySlice[] {
  const presentFactionIds = new Set<string>()
  for (const character of presentCharacters) {
    if (character.factionId !== null) presentFactionIds.add(character.factionId)
  }
  return factions
    .filter((f) => presentFactionIds.has(f.id))
    .map((f) => ({
      factionId: f.id,
      name: f.name,
      currentSituation: f.currentSituation,
      score: 5,
    }))
}
