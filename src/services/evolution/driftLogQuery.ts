import type { DriftAction, DriftFinding } from '@/types/character'

import { readDriftLog } from './driftLog'

export interface DriftLogQuery {
  novelDir: string
  characterId: string
  filter?: {
    fromTime?: string
    toTime?: string
    actions?: DriftAction[]
  }
}

export async function queryDriftLog(query: DriftLogQuery): Promise<DriftFinding[]> {
  const all = await readDriftLog(query.novelDir, query.characterId)
  return all.filter((finding) => {
    const f = query.filter
    if (!f) return true
    if (f.fromTime && finding.detectedAt < f.fromTime) return false
    if (f.toTime && finding.detectedAt > f.toTime) return false
    if (f.actions && finding.decision && !f.actions.includes(finding.decision)) return false
    return true
  })
}
