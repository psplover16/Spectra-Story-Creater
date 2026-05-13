import { readSituationHistory } from '@/services/files/factionRepository'
import type { FactionSituationHistoryEntry } from '@/types/faction'

export interface HistoryQuery {
  novelDir: string
  filter?: {
    factionId?: string
    fromTime?: string
    toTime?: string
  }
}

export async function queryFactionHistory(
  query: HistoryQuery,
): Promise<FactionSituationHistoryEntry[]> {
  const all = await readSituationHistory(query.novelDir)
  return all.filter((entry) => {
    const f = query.filter
    if (!f) return true
    if (f.factionId && entry.factionId !== f.factionId) return false
    if (f.fromTime && entry.at < f.fromTime) return false
    if (f.toTime && entry.at > f.toTime) return false
    return true
  })
}
