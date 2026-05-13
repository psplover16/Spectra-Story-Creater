import type { Character, DriftFinding } from '@/types/character'

export interface PersonalityDetectorInput {
  character: Character
  candidateResponse: string
  chapterId: string
  paragraphId?: string
}

const SHIFT_PATTERNS: Array<{ from: string; to: string }> = [
  { from: '市井狡黠', to: '捨命相護' },
  { from: '冷漠', to: '激情' },
  { from: '懦弱', to: '勇敢' },
  { from: '貪財', to: '無私' },
]

/**
 * 偵測候選回應是否暗示角色性格大幅偏移。
 *
 * 規格：character-evolution（Detect personality drift after each AI invocation）。
 * 規則：若候選回應大段描寫與目前 personality 對立的特徵 → 認定為 drift。
 */
export function detectPersonalityDrift(input: PersonalityDetectorInput): DriftFinding | null {
  const personality = input.character.personality
  for (const { from, to } of SHIFT_PATTERNS) {
    if (personality.includes(from) && input.candidateResponse.includes(to)) {
      return {
        characterId: input.character.id,
        detectedAt: new Date().toISOString(),
        chapterId: input.chapterId,
        paragraphId: input.paragraphId,
        evidence: `角色目前性格寫作「${from}」，回應卻體現「${to}」`,
        suggestedRewrite: `${personality}；經過此章節事件後，逐漸顯露「${to}」的一面。`,
        decision: null,
      }
    }
  }
  return null
}
