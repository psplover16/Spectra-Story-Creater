import type { AiInvokeInput, AiInvokeResult, AiSource } from '../../src/types/ai'
import type { AuditorInput } from '../../src/services/consistency/auditor'
import { auditorDryRun } from '../../src/services/consistency/auditor'
import type { AuditResult } from '../../src/types/audit'

export interface AiHandlersDeps {
  invoke(source: AiSource, input: AiInvokeInput): Promise<AiInvokeResult>
}

export function createAiHandlers(deps: AiHandlersDeps) {
  return {
    async invoke(source: AiSource, input: AiInvokeInput): Promise<AiInvokeResult> {
      return deps.invoke(source, input)
    },
    dryRun(input: AuditorInput): AuditResult {
      return auditorDryRun(input)
    },
  } as const
}

export interface IpcLike {
  handle(channel: string, listener: (event: unknown, ...args: unknown[]) => unknown): void
}

export function registerAiHandlers(ipc: IpcLike, deps: AiHandlersDeps): void {
  const handlers = createAiHandlers(deps)
  ipc.handle('ai:invoke', (_e, source, input) =>
    handlers.invoke(source as AiSource, input as AiInvokeInput),
  )
  ipc.handle('consistency:dryRun', (_e, input) => handlers.dryRun(input as AuditorInput))
}
