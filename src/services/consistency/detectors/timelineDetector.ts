import type { Character } from '@/types/character'
import type { AuditFinding } from '@/types/audit'

export interface TimelineDetectorInput {
  candidateResponse: string
  presentCharacters: Character[]
  deceasedCharacterIds: string[]
  chapterId: string
}

export function detectTimelineConflict(input: TimelineDetectorInput): AuditFinding[] {
  const findings: AuditFinding[] = []
  for (const character of input.presentCharacters) {
    if (
      input.deceasedCharacterIds.includes(character.id) &&
      input.candidateResponse.includes(character.name)
    ) {
      findings.push({
        category: 'timeline-conflict',
        characterId: character.id,
        chapterId: input.chapterId,
        evidence: `候選回應提到「${character.name}」，但該角色在先前章節已標記為過世`,
        severity: 'high',
      })
    }
  }
  return findings
}
