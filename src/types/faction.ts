/**
 * Faction 資料模型型別，對應 factions/<faction-id>.json schema。
 * 規格：novel-data-model（Faction file structure）、faction-tracking。
 */

export type FactionAlignment = 'protagonist' | 'antagonist' | 'neutral'

export interface Faction {
  id: string
  name: string
  alignment: FactionAlignment
  description: string
  currentSituation: string
  keyMembers: string[]
  createdAt: string
  updatedAt: string
}

export interface FactionSituationHistoryEntry {
  factionId: string
  at: string
  previousSituation: string
  newSituation: string
}
