export type AuditCategory =
  | 'ooc'
  | 'unexplained-ability'
  | 'relationship-conflict'
  | 'worldview-conflict'
  | 'timeline-conflict'

export interface AuditFinding {
  category: AuditCategory
  characterId?: string
  factionId?: string
  chapterId?: string
  evidence: string
  recommendation?: string
  severity: 'low' | 'medium' | 'high'
}

export interface AuditInconclusive {
  reason: string
  missingSlices: string[]
}

export type AuditResult =
  | { kind: 'clean' }
  | { kind: 'findings'; findings: AuditFinding[] }
  | { kind: 'inconclusive'; details: AuditInconclusive }

export interface AuditIgnoreRecord {
  finding: AuditFinding
  ignoredAt: string
  chapterId: string
  reason?: string
}

export interface MuteWindow {
  category: AuditCategory
  startChapterIndex: number
  endChapterIndex: number
}
