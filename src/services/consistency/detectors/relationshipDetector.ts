import type { Character } from '@/types/character'
import type { AuditFinding } from '@/types/audit'

export interface RelationshipDetectorInput {
  candidateResponse: string
  presentCharacters: Character[]
  chapterId: string
}

const ENMITY_KEYWORDS = ['仇敵', '不共戴天', '勢不兩立']
const FRIENDSHIP_KEYWORDS = ['結拜', '兄弟', '盟友']

export function detectRelationshipConflict(input: RelationshipDetectorInput): AuditFinding[] {
  const findings: AuditFinding[] = []
  for (const character of input.presentCharacters) {
    if (!input.candidateResponse.includes(character.name)) continue
    for (const rel of character.relationships) {
      const target = input.presentCharacters.find((c) => c.id === rel.targetCharacterId)
      if (!target) continue
      if (
        FRIENDSHIP_KEYWORDS.some((k) => rel.description.includes(k)) &&
        ENMITY_KEYWORDS.some((k) => input.candidateResponse.includes(k)) &&
        input.candidateResponse.includes(target.name)
      ) {
        findings.push({
          category: 'relationship-conflict',
          characterId: character.id,
          chapterId: input.chapterId,
          evidence: `關係檔案載明「${character.name}」與「${target.name}」為盟友（${rel.description}），候選回應卻寫作仇敵`,
          severity: 'high',
        })
      }
    }
  }
  return findings
}
