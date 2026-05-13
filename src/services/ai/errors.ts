import type { AiSource } from '@/types/ai'

export class CliUnavailableError extends Error {
  constructor(public readonly source: AiSource) {
    super(`AI CLI 不可用：${source}（請確認已安裝並可在 PATH 找到）`)
    this.name = 'CliUnavailableError'
  }
}

export class CliExecutionError extends Error {
  constructor(
    public readonly source: AiSource,
    public readonly exitCode: number,
    public readonly stderr: string,
  ) {
    super(`AI CLI 執行失敗：${source} exit=${exitCode}：${stderr.slice(0, 200)}`)
    this.name = 'CliExecutionError'
  }
}

export class UnknownRoleError extends Error {
  constructor(public readonly role: string) {
    super(`未知的 AI 職能：${role}`)
    this.name = 'UnknownRoleError'
  }
}

export class CliTimeoutError extends Error {
  constructor(
    public readonly source: AiSource,
    public readonly timeoutMs: number,
  ) {
    super(`AI CLI 執行超時：${source}（${timeoutMs}ms）`)
    this.name = 'CliTimeoutError'
  }
}
