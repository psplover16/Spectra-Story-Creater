/**
 * Character 資料模型型別。對應 characters/<character-id>.json schema。
 * 規格：novel-data-model（Character file structure）、character-evolution（DriftFinding）。
 */

export interface Relationship {
  targetCharacterId: string
  kind: string
  description: string
}

export interface Character {
  id: string
  name: string
  personality: string
  abilities: string[]
  appearance: string
  factionId: string | null
  socialStatus: string
  relationships: Relationship[]
  notes: string
  createdAt: string
  updatedAt: string
}

export type DriftAction = 'accept-as-suggested' | 'edit-then-accept' | 'dismiss'

export interface DriftFinding {
  characterId: string
  detectedAt: string
  chapterId: string
  paragraphId?: string
  evidence: string
  suggestedRewrite: string
  decision: DriftAction | null
}
