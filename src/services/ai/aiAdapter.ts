import type { AiAdapter, AiInvokeInput, AiInvokeResult, AiSource } from '@/types/ai'

export type { AiAdapter, AiInvokeInput, AiInvokeResult, AiSource }

/**
 * 與本機 CLI 子行程溝通的最小執行器介面，提供 adapter 注入測試用 stub。
 */
export interface CliRunner {
  run(input: CliRunnerInput): Promise<CliRunnerResult>
}

export interface CliRunnerInput {
  command: string
  args: string[]
  stdin: string
  env?: NodeJS.ProcessEnv
  timeoutMs?: number
}

export type CliRunnerResult =
  | { kind: 'ok'; stdout: string; stderr: string; durationMs: number }
  | { kind: 'unavailable'; cause: string }
  | { kind: 'failed'; exitCode: number; stderr: string }
  | { kind: 'timeout'; timeoutMs: number }
