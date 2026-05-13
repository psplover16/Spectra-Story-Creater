import type {
  AiAdapter,
  AiInvokeInput,
  AiInvokeResult,
  AiResolver,
  AiSource,
  ResolveQuery,
} from '@/types/ai'

import { CliExecutionError, CliUnavailableError } from '@/services/ai/errors'

export type CliFallbackAction = 'retry' | 'switch' | 'cancel'

export interface CliFallbackPromptInput {
  failedSource: AiSource
  reason: 'unavailable' | 'execution-error'
  errorMessage: string
}

export interface CliFallbackPromptResult {
  action: CliFallbackAction
  switchTo?: AiSource
}

export interface UseAiInvokerOptions {
  resolver: AiResolver
  getAdapter: (source: AiSource) => AiAdapter
  promptFallback: (input: CliFallbackPromptInput) => Promise<CliFallbackPromptResult>
}

export interface InvokeOutcome {
  status: 'ok' | 'cancelled'
  result?: AiInvokeResult
  /** 走到最終成功的 source，便於 SuggestionSourceBadge 顯示 */
  resolvedSource?: AiSource
  triedSources: AiSource[]
}

export function useAiInvoker(opts: UseAiInvokerOptions) {
  async function invoke(invokeInput: AiInvokeInput, query: ResolveQuery): Promise<InvokeOutcome> {
    const triedSources: AiSource[] = []
    let adapter = opts.resolver.resolve(query).adapter
    for (;;) {
      triedSources.push(adapter.source)
      try {
        const result = await adapter.invoke(invokeInput)
        return {
          status: 'ok',
          result,
          resolvedSource: adapter.source,
          triedSources,
        }
      } catch (err) {
        const reason: CliFallbackPromptInput['reason'] =
          err instanceof CliUnavailableError ? 'unavailable' : 'execution-error'
        if (!(err instanceof CliUnavailableError) && !(err instanceof CliExecutionError)) {
          throw err
        }
        const decision = await opts.promptFallback({
          failedSource: adapter.source,
          reason,
          errorMessage: (err as Error).message,
        })
        if (decision.action === 'cancel') {
          return { status: 'cancelled', triedSources }
        }
        if (decision.action === 'retry') {
          continue
        }
        if (decision.action === 'switch') {
          const nextSource = decision.switchTo ?? otherSource(adapter.source)
          adapter = opts.getAdapter(nextSource)
          continue
        }
      }
    }
  }

  return { invoke }
}

function otherSource(s: AiSource): AiSource {
  return s === 'codex' ? 'claude' : 'codex'
}
