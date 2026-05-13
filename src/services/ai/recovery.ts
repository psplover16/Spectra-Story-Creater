import type { AiSource } from '@/types/ai'

export type RecoveryAction = 'retry' | 'switch' | 'cancel'

export interface RecoveryInput {
  failedSource: AiSource
  attemptsSoFar: number
  triedSources: ReadonlySet<AiSource>
}

export interface RecoveryDecisionResolver {
  prompt(input: RecoveryInput): Promise<RecoveryAction>
}

export async function decideRecovery(
  input: RecoveryInput,
  resolver: RecoveryDecisionResolver,
): Promise<{ action: RecoveryAction; nextSource?: AiSource }> {
  const action = await resolver.prompt(input)
  if (action === 'switch') {
    const candidates: AiSource[] = (['codex', 'claude'] as const).filter(
      (s) => !input.triedSources.has(s),
    )
    if (candidates.length === 0) {
      // 兩個 CLI 都試過 → 退回 retry
      return { action: 'retry' }
    }
    return { action: 'switch', nextSource: candidates[0] }
  }
  return { action }
}
