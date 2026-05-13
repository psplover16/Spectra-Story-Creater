import { describe, expect, it } from 'vitest'

import { runBounded } from '../../../electron/ai/spawnSafety'
import { CliExecutionError, CliTimeoutError } from '@/services/ai/errors'

describe('runBounded', () => {
  it('超時拋 CliTimeoutError', async () => {
    await expect(
      runBounded({
        source: 'codex',
        runner: () => new Promise(() => {}), // never resolves
        timeoutMs: 50,
        maxStdoutBytes: 1000,
      }),
    ).rejects.toBeInstanceOf(CliTimeoutError)
  })

  it('stdout 超過上限拋 CliExecutionError', async () => {
    await expect(
      runBounded({
        source: 'codex',
        runner: async () => ({ stdout: 'x'.repeat(2000), stderr: '', exitCode: 0 }),
        timeoutMs: 5000,
        maxStdoutBytes: 100,
      }),
    ).rejects.toBeInstanceOf(CliExecutionError)
  })

  it('正常回傳', async () => {
    const r = await runBounded({
      source: 'codex',
      runner: async () => ({ stdout: 'ok', stderr: '', exitCode: 0 }),
      timeoutMs: 5000,
      maxStdoutBytes: 1000,
    })
    expect(r.stdout).toBe('ok')
  })
})
