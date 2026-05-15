import type { Character } from '@/types/character'
import type { Faction } from '@/types/faction'
import type { FactionSummarySlice } from '@/types/ai'

export function buildFactionSummarySlices(
  presentCharacters: Character[],
  factions: Faction[],
): FactionSummarySlice[] {
  const presentFactionIds = new Set<string>()
  for (const character of presentCharacters) {
    for (const fid of character.factionIds) {
      presentFactionIds.add(fid)
    }
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
