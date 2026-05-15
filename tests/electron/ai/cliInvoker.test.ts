import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { EventEmitter } from 'node:events'

import { invokeCli } from '../../../electron/ai/cliInvoker'
import {
  CliExecutionError,
  CliTimeoutError,
  CliUnavailableError,
} from '@/services/ai/errors'
import type { AiInvokeInput, AiSource } from '@/types/ai'

const baseInput: AiInvokeInput = {
  context: {
    worldview: [],
    characters: [],
    overallPlot: { summary: '', chapters: [] },
    presentCharacters: [],
    chapterOutline: { chapterId: 'ch1', outline: '' },
    chapterScene: {
      chapterId: 'ch1',
      scene: { location: '', time: '', weather: '', props: [], mood: '' },
    },
  },
  prompt: 'hello',
  role: 'plot-driver',
}

class MockChild extends EventEmitter {
  stdin = {
    write: vi.fn(),
    end: vi.fn(),
  }
  stdout = new EventEmitter()
  stderr = new EventEmitter()
  kill = vi.fn()
}

function makeSpawn(setup: (child: MockChild) => void) {
  return vi.fn(() => {
    const child = new MockChild()
    queueMicrotask(() => setup(child))
    return child as unknown as ReturnType<typeof import('node:child_process').spawn>
  })
}

describe('invokeCli', () => {
  let originalEnv: string | undefined

  beforeEach(() => {
    originalEnv = process.env.SPECTRA_AI_TIMEOUT_MS
    delete process.env.SPECTRA_AI_TIMEOUT_MS
  })

  afterEach(() => {
    if (originalEnv === undefined) delete process.env.SPECTRA_AI_TIMEOUT_MS
    else process.env.SPECTRA_AI_TIMEOUT_MS = originalEnv
  })

  it('成功路徑：mock spawn stdout=AI response、exit 0 → 回 AiInvokeResult.text=trimmed', async () => {
    const spawnFn = makeSpawn((child) => {
      child.stdout.emit('data', Buffer.from('AI response\n'))
      child.emit('close', 0)
    })
    const result = await invokeCli('codex' as AiSource, baseInput, {
      getCliPath: async () => '/usr/local/bin/codex',
      spawnFn,
      timeoutMs: 5000,
    })
    expect(result.text).toBe('AI response')
    expect(result.source).toBe('codex')
    expect(typeof result.durationMs).toBe('number')
  })

  it('CLI 不可用：getCliPath 回 null → throw CliUnavailableError', async () => {
    await expect(
      invokeCli('claude' as AiSource, baseInput, {
        getCliPath: async () => null,
      }),
    ).rejects.toBeInstanceOf(CliUnavailableError)
  })

  it('exit code 非 0：stderr=boom、exit 1 → throw CliExecutionError 含 exitCode 與 stderr', async () => {
    const spawnFn = makeSpawn((child) => {
      child.stderr.emit('data', Buffer.from('boom'))
      child.emit('close', 1)
    })
    try {
      await invokeCli('codex' as AiSource, baseInput, {
        getCliPath: async () => '/usr/local/bin/codex',
        spawnFn,
        timeoutMs: 5000,
      })
      throw new Error('expected throw')
    } catch (err) {
      expect(err).toBeInstanceOf(CliExecutionError)
      const e = err as CliExecutionError
      expect(e.exitCode).toBe(1)
      expect(e.stderr).toContain('boom')
    }
  })

  it('timeout：spawn 不 close、timeoutMs=100 → child.kill 被呼叫、throw CliTimeoutError', async () => {
    const childRef: { current: MockChild | null } = { current: null }
    const spawnFn = vi.fn(() => {
      const child = new MockChild()
      childRef.current = child
      // 故意不 emit close，模擬 hang
      return child as unknown as ReturnType<typeof import('node:child_process').spawn>
    })
    const start = Date.now()
    try {
      await invokeCli('codex' as AiSource, baseInput, {
        getCliPath: async () => '/usr/local/bin/codex',
        spawnFn,
        timeoutMs: 100,
      })
      throw new Error('expected throw')
    } catch (err) {
      expect(err).toBeInstanceOf(CliTimeoutError)
      expect(childRef.current?.kill).toHaveBeenCalled()
      const elapsed = Date.now() - start
      expect(elapsed).toBeGreaterThanOrEqual(80)
    }
  })

  it('SPECTRA_AI_TIMEOUT_MS 環境變數覆寫預設 30000', async () => {
    process.env.SPECTRA_AI_TIMEOUT_MS = '50'
    const childRef: { current: MockChild | null } = { current: null }
    const spawnFn = vi.fn(() => {
      const child = new MockChild()
      childRef.current = child
      return child as unknown as ReturnType<typeof import('node:child_process').spawn>
    })
    const start = Date.now()
    try {
      await invokeCli('codex' as AiSource, baseInput, {
        getCliPath: async () => '/usr/local/bin/codex',
        spawnFn,
        // 不傳 timeoutMs，靠 env 覆寫
      })
      throw new Error('expected throw')
    } catch (err) {
      expect(err).toBeInstanceOf(CliTimeoutError)
      const elapsed = Date.now() - start
      expect(elapsed).toBeLessThan(1000)
      expect(childRef.current?.kill).toHaveBeenCalled()
    }
  })
})
