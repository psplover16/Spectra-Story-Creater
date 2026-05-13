import type {
  AiAdapter,
  AiInvokeInput,
  AiResolver,
  AiSource,
  AssembledContext,
  ResolveQuery,
} from '@/types/ai'
import type { AuditResult } from '@/types/audit'

import { CliExecutionError, CliUnavailableError } from '@/services/ai/errors'

export type SuggestionStatus = 'ok' | 'cancelled' | 'findings' | 'inconclusive'

export interface SuggestionRequestInput {
  invokeInput: AiInvokeInput
  query: ResolveQuery
  context: AssembledContext
}

export interface SuggestionRequestResult {
  status: SuggestionStatus
  text?: string
  source?: AiSource
  findings?: AuditResult
}

export interface UseSuggestionRequestOptions {
  resolver: AiResolver
  getAdapter: (source: AiSource) => AiAdapter
  runAuditor: (candidate: string, context: AssembledContext) => AuditResult
  promptFallback: (failedSource: AiSource) => Promise<'switch' | 'retry' | 'cancel'>
}

export function useSuggestionRequest(opts: UseSuggestionRequestOptions) {
  async function invoke(input: SuggestionRequestInput): Promise<SuggestionRequestResult> {
    let adapter = opts.resolver.resolve(input.query).adapter
    for (;;) {
      try {
        const result = await adapter.invoke(input.invokeInput)
        const audit = opts.runAuditor(result.text, input.context)
        if (audit.kind === 'findings') {
          return { status: 'findings', findings: audit, text: result.text, source: result.source }
        }
        if (audit.kind === 'inconclusive') {
          return {
            status: 'inconclusive',
            findings: audit,
            text: result.text,
            source: result.source,
          }
        }
        return { status: 'ok', text: result.text, source: result.source }
      } catch (err) {
        if (!(err instanceof CliUnavailableError) && !(err instanceof CliExecutionError)) {
          throw err
        }
        const decision = await opts.promptFallback(adapter.source)
        if (decision === 'cancel') return { status: 'cancelled' }
        if (decision === 'switch') {
          adapter = opts.getAdapter(adapter.source === 'codex' ? 'claude' : 'codex')
        }
      }
    }
  }

  return { invoke }
}
