import { readCharacter, writeCharacter } from '@/services/files/characterRepository'
import { appendDriftFinding } from '@/services/evolution/driftLog'
import type { Character, DriftAction, DriftFinding } from '@/types/character'

export interface ApplyDriftSuggestionInput {
  novelDir: string
  finding: DriftFinding
  action: DriftAction
  /** edit-then-accept 時使用者修改後的 personality */
  customPersonality?: string
}

export async function applyDriftSuggestion(input: ApplyDriftSuggestionInput): Promise<Character> {
  const finding = { ...input.finding, decision: input.action }

  if (input.action === 'dismiss') {
    await appendDriftFinding(input.novelDir, finding)
    return readCharacter(input.novelDir, finding.characterId)
  }

  const existing = await readCharacter(input.novelDir, finding.characterId)
  const nextPersonality =
    input.action === 'accept-as-suggested'
      ? finding.suggestedRewrite
      : (input.customPersonality ?? finding.suggestedRewrite)

  const updated = await writeCharacter(input.novelDir, {
    id: existing.id,
    name: existing.name,
    personality: nextPersonality,
    abilities: existing.abilities,
    appearance: existing.appearance,
    factionIds: existing.factionIds,
    socialStatus: existing.socialStatus,
    relationships: existing.relationships,
    notes: existing.notes,
  })
  await appendDriftFinding(input.novelDir, finding)
  return updated
}
