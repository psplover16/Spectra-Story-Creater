import type { Character } from '@/types/character'
import type { AuditFinding } from '@/types/audit'

export interface OocDetectorInput {
  candidateResponse: string
  presentCharacters: Character[]
  chapterId: string
}

/**
 * 簡化版規則：若候選回應中提到某角色名稱，且該角色 personality 寫「冷靜」「沉默」之類
 * 但回應出現「大喊」「激烈」字眼，視為 OOC 候選。
 */
const OUTBURST_KEYWORDS = ['大喊', '激烈', '狂笑', '暴怒']
const CALM_PERSONA_HINTS = ['冷靜', '沉默', '寡言']

export function detectOoc(input: OocDetectorInput): AuditFinding[] {
  const findings: AuditFinding[] = []
  for (const character of input.presentCharacters) {
    if (!input.candidateResponse.includes(character.name)) continue
    const persona = character.personality
    if (!CALM_PERSONA_HINTS.some((h) => persona.includes(h))) continue
    if (OUTBURST_KEYWORDS.some((k) => input.candidateResponse.includes(k))) {
      findings.push({
        category: 'ooc',
        characterId: character.id,
        chapterId: input.chapterId,
        evidence: `候選回應出現劇烈動作描述，與角色「${character.name}」沉穩個性（${persona}）不符`,
        severity: 'medium',
      })
    }
  }
  return findings
}
