import type { AiAdapter, AiInvokeInput, AiInvokeResult, AiSource } from '@/types/ai'

import type { CliRunner } from './aiAdapter'
import { CliExecutionError, CliTimeoutError, CliUnavailableError } from './errors'

const SOURCE: AiSource = 'codex'

export interface CodexAdapterOptions {
  runner: CliRunner
  command?: string
}

export function createCodexAdapter(opts: CodexAdapterOptions): AiAdapter {
  const command = opts.command ?? 'codex'
  return {
    source: SOURCE,
    async invoke(input: AiInvokeInput): Promise<AiInvokeResult> {
      const result = await opts.runner.run({
        command,
        args: ['exec', '--role', input.role],
        stdin: input.prompt,
      })
      if (result.kind === 'unavailable') {
        throw new CliUnavailableError(SOURCE)
      }
      if (result.kind === 'timeout') {
        throw new CliTimeoutError(SOURCE, result.timeoutMs)
      }
      if (result.kind === 'failed') {
        throw new CliExecutionError(SOURCE, result.exitCode, result.stderr)
      }
      return {
        text: result.stdout,
        source: SOURCE,
        durationMs: result.durationMs,
      }
    },
  }
}
