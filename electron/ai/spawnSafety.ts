import { CliExecutionError, CliTimeoutError } from '../../src/services/ai/errors'
import type { AiSource } from '../../src/types/ai'

export interface RunBoundedInput {
  source: AiSource
  runner: () => Promise<{ stdout: string; stderr: string; exitCode: number }>
  timeoutMs: number
  maxStdoutBytes: number
}

export async function runBounded(input: RunBoundedInput): Promise<{
  stdout: string
  stderr: string
  exitCode: number
}> {
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new CliTimeoutError(input.source, input.timeoutMs)), input.timeoutMs),
  )

  const result = await Promise.race([input.runner(), timeoutPromise])
  if (result.stdout.length > input.maxStdoutBytes) {
    throw new CliExecutionError(
      input.source,
      result.exitCode,
      `stdout 超過上限（${input.maxStdoutBytes} bytes）`,
    )
  }
  return result
}
