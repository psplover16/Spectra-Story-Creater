import type { Character } from '@/types/character'
import type { AuditFinding } from '@/types/audit'

export interface AbilityDetectorInput {
  candidateResponse: string
  presentCharacters: Character[]
  chapterId: string
}

const ABILITY_PATTERNS = ['輕功', '內力', '招式', '法術', '飛劍', '隱身術']

export function detectUnexplainedAbility(input: AbilityDetectorInput): AuditFinding[] {
  const findings: AuditFinding[] = []
  for (const character of input.presentCharacters) {
    if (!input.candidateResponse.includes(character.name)) continue
    for (const pattern of ABILITY_PATTERNS) {
      if (
        input.candidateResponse.includes(pattern) &&
        !character.abilities.some((a) => a.includes(pattern))
      ) {
        findings.push({
          category: 'unexplained-ability',
          characterId: character.id,
          chapterId: input.chapterId,
          evidence: `候選回應描寫「${character.name}」使用「${pattern}」，但角色 abilities 並未登錄此能力`,
          severity: 'high',
        })
      }
    }
  }
  return findings
}
