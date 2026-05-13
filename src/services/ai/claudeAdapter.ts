import type { AiAdapter, AiInvokeInput, AiInvokeResult, AiSource } from '@/types/ai'

import type { CliRunner } from './aiAdapter'
import { CliExecutionError, CliTimeoutError, CliUnavailableError } from './errors'

const SOURCE: AiSource = 'claude'

export interface ClaudeAdapterOptions {
  runner: CliRunner
  command?: string
}

export function createClaudeAdapter(opts: ClaudeAdapterOptions): AiAdapter {
  const command = opts.command ?? 'claude'
  return {
    source: SOURCE,
    async invoke(input: AiInvokeInput): Promise<AiInvokeResult> {
      const result = await opts.runner.run({
        command,
        args: ['--print', '--role', input.role],
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
