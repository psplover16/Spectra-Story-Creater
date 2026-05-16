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

  it('預設 timeout 應為 120000 ms（無 env、無 deps.timeoutMs）', async () => {
    delete process.env.SPECTRA_AI_TIMEOUT_MS
    vi.useFakeTimers()
    try {
      const spawnFn = vi.fn(() => {
        const child = new MockChild()
        return child as unknown as ReturnType<typeof import('node:child_process').spawn>
      })
      // 預先 .catch 截掉 rejection，避免 fake timer 觸發 reject 時被視為 unhandled
      const settled = invokeCli('codex' as AiSource, baseInput, {
        getCliPath: async () => '/usr/local/bin/codex',
        spawnFn,
      }).then(
        (v) => ({ ok: true as const, value: v }),
        (err: unknown) => ({ ok: false as const, error: err }),
      )
      await vi.advanceTimersByTimeAsync(120001)
      const result = await settled
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toBeInstanceOf(CliTimeoutError)
        expect((result.error as CliTimeoutError).timeoutMs).toBe(120000)
      }
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('invokeCli platform-aware spawn dispatch', () => {
  let originalPlatform: NodeJS.Platform
  let originalEnv: string | undefined

  beforeEach(() => {
    originalPlatform = process.platform
    originalEnv = process.env.SPECTRA_AI_TIMEOUT_MS
    delete process.env.SPECTRA_AI_TIMEOUT_MS
  })

  afterEach(() => {
    Object.defineProperty(process, 'platform', { value: originalPlatform, configurable: true })
    if (originalEnv === undefined) delete process.env.SPECTRA_AI_TIMEOUT_MS
    else process.env.SPECTRA_AI_TIMEOUT_MS = originalEnv
  })

  function setPlatform(p: NodeJS.Platform): void {
    Object.defineProperty(process, 'platform', { value: p, configurable: true })
  }

  it('Windows + .cmd 路徑 → 改 spawn cmd.exe 並用 /d /s /c 包裝原路徑', async () => {
    setPlatform('win32')
    const spawnFn = makeSpawn((child) => {
      child.stdout.emit('data', Buffer.from('ok'))
      child.emit('close', 0)
    })
    await invokeCli('codex' as AiSource, baseInput, {
      getCliPath: async () => 'C:\\nvm4w\\nodejs\\codex.cmd',
      spawnFn,
      timeoutMs: 5000,
    })
    expect(spawnFn).toHaveBeenCalledTimes(1)
    const call = spawnFn.mock.calls[0]
    expect(call[0]).toBe('cmd.exe')
    expect(call[1]).toEqual(['/d', '/s', '/c', 'C:\\nvm4w\\nodejs\\codex.cmd', 'exec'])
  })

  it('Windows + .bat 路徑 → 改 spawn cmd.exe 並用 /d /s /c 包裝', async () => {
    setPlatform('win32')
    const spawnFn = makeSpawn((child) => {
      child.stdout.emit('data', Buffer.from('ok'))
      child.emit('close', 0)
    })
    await invokeCli('claude' as AiSource, baseInput, {
      getCliPath: async () => 'C:\\tools\\claude.bat',
      spawnFn,
      timeoutMs: 5000,
    })
    expect(spawnFn).toHaveBeenCalledTimes(1)
    const call = spawnFn.mock.calls[0]
    expect(call[0]).toBe('cmd.exe')
    expect(call[1]).toEqual(['/d', '/s', '/c', 'C:\\tools\\claude.bat', '-p'])
  })

  it('Windows + .exe 路徑 → 直接 spawn 原路徑，不包 cmd.exe', async () => {
    setPlatform('win32')
    const spawnFn = makeSpawn((child) => {
      child.stdout.emit('data', Buffer.from('ok'))
      child.emit('close', 0)
    })
    await invokeCli('codex' as AiSource, baseInput, {
      getCliPath: async () => 'C:\\Program Files\\Anthropic\\codex.exe',
      spawnFn,
      timeoutMs: 5000,
    })
    expect(spawnFn).toHaveBeenCalledTimes(1)
    const call = spawnFn.mock.calls[0]
    expect(call[0]).toBe('C:\\Program Files\\Anthropic\\codex.exe')
    expect(call[1]).toEqual(['exec'])
  })

  it('POSIX 任意路徑 → 直接 spawn 原路徑（既有行為保持）', async () => {
    setPlatform('linux')
    const spawnFn = makeSpawn((child) => {
      child.stdout.emit('data', Buffer.from('ok'))
      child.emit('close', 0)
    })
    await invokeCli('codex' as AiSource, baseInput, {
      getCliPath: async () => '/usr/local/bin/codex',
      spawnFn,
      timeoutMs: 5000,
    })
    expect(spawnFn).toHaveBeenCalledTimes(1)
    const call = spawnFn.mock.calls[0]
    expect(call[0]).toBe('/usr/local/bin/codex')
    expect(call[1]).toEqual(['exec'])
  })

  it('Windows + .cmd 包裝下 stderr/exitCode 仍正確傳遞（cmd.exe 不污染 stderr）', async () => {
    setPlatform('win32')
    const spawnFn = makeSpawn((child) => {
      child.stderr.emit('data', Buffer.from('boom'))
      child.emit('close', 1)
    })
    try {
      await invokeCli('codex' as AiSource, baseInput, {
        getCliPath: async () => 'C:\\a\\codex.cmd',
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

  it('Windows 大寫副檔名 .CMD → 仍被識別為 cmd shim 並包裝', async () => {
    setPlatform('win32')
    const spawnFn = makeSpawn((child) => {
      child.stdout.emit('data', Buffer.from('ok'))
      child.emit('close', 0)
    })
    await invokeCli('codex' as AiSource, baseInput, {
      getCliPath: async () => 'C:\\path\\codex.CMD',
      spawnFn,
      timeoutMs: 5000,
    })
    expect(spawnFn).toHaveBeenCalledTimes(1)
    const call = spawnFn.mock.calls[0]
    expect(call[0]).toBe('cmd.exe')
    expect(call[1]).toEqual(['/d', '/s', '/c', 'C:\\path\\codex.CMD', 'exec'])
  })
})

describe('invokeCli source-specific non-interactive subcommand', () => {
  let originalPlatform: NodeJS.Platform

  beforeEach(() => {
    originalPlatform = process.platform
  })
  afterEach(() => {
    Object.defineProperty(process, 'platform', { value: originalPlatform, configurable: true })
  })

  function setPlatform(p: NodeJS.Platform): void {
    Object.defineProperty(process, 'platform', { value: p, configurable: true })
  }

  it('Windows + codex + .cmd → cmd.exe wrapper + exec subcommand at end', async () => {
    setPlatform('win32')
    const spawnFn = makeSpawn((child) => {
      child.stdout.emit('data', Buffer.from('ok'))
      child.emit('close', 0)
    })
    await invokeCli('codex' as AiSource, baseInput, {
      getCliPath: async () => 'C:\\nvm4w\\nodejs\\codex.cmd',
      spawnFn,
      timeoutMs: 5000,
    })
    const call = spawnFn.mock.calls[0]
    expect(call[0]).toBe('cmd.exe')
    expect(call[1]).toEqual(['/d', '/s', '/c', 'C:\\nvm4w\\nodejs\\codex.cmd', 'exec'])
  })

  it('Windows + claude + .cmd → cmd.exe wrapper + -p flag at end', async () => {
    setPlatform('win32')
    const spawnFn = makeSpawn((child) => {
      child.stdout.emit('data', Buffer.from('ok'))
      child.emit('close', 0)
    })
    await invokeCli('claude' as AiSource, baseInput, {
      getCliPath: async () => 'C:\\nvm4w\\nodejs\\claude.cmd',
      spawnFn,
      timeoutMs: 5000,
    })
    const call = spawnFn.mock.calls[0]
    expect(call[0]).toBe('cmd.exe')
    expect(call[1]).toEqual(['/d', '/s', '/c', 'C:\\nvm4w\\nodejs\\claude.cmd', '-p'])
  })

  it('Windows + codex + .exe → direct spawn + exec', async () => {
    setPlatform('win32')
    const spawnFn = makeSpawn((child) => {
      child.stdout.emit('data', Buffer.from('ok'))
      child.emit('close', 0)
    })
    await invokeCli('codex' as AiSource, baseInput, {
      getCliPath: async () => 'C:\\Program Files\\Anthropic\\codex.exe',
      spawnFn,
      timeoutMs: 5000,
    })
    const call = spawnFn.mock.calls[0]
    expect(call[0]).toBe('C:\\Program Files\\Anthropic\\codex.exe')
    expect(call[1]).toEqual(['exec'])
  })

  it('POSIX + codex → direct spawn + exec', async () => {
    setPlatform('linux')
    const spawnFn = makeSpawn((child) => {
      child.stdout.emit('data', Buffer.from('ok'))
      child.emit('close', 0)
    })
    await invokeCli('codex' as AiSource, baseInput, {
      getCliPath: async () => '/usr/local/bin/codex',
      spawnFn,
      timeoutMs: 5000,
    })
    const call = spawnFn.mock.calls[0]
    expect(call[0]).toBe('/usr/local/bin/codex')
    expect(call[1]).toEqual(['exec'])
  })

  it('POSIX + claude → direct spawn + -p (darwin)', async () => {
    setPlatform('darwin')
    const spawnFn = makeSpawn((child) => {
      child.stdout.emit('data', Buffer.from('ok'))
      child.emit('close', 0)
    })
    await invokeCli('claude' as AiSource, baseInput, {
      getCliPath: async () => '/opt/homebrew/bin/claude',
      spawnFn,
      timeoutMs: 5000,
    })
    const call = spawnFn.mock.calls[0]
    expect(call[0]).toBe('/opt/homebrew/bin/claude')
    expect(call[1]).toEqual(['-p'])
  })

  it('prompt 仍透過 child.stdin.write 餵入；argv 不含 prompt 字串', async () => {
    setPlatform('linux')
    let stdinWrites: unknown[] = []
    const spawnFn = vi.fn(() => {
      const child = new MockChild()
      child.stdin.write = vi.fn((chunk: unknown) => {
        stdinWrites.push(chunk)
      })
      queueMicrotask(() => {
        child.stdout.emit('data', Buffer.from('ok'))
        child.emit('close', 0)
      })
      return child as unknown as ReturnType<typeof import('node:child_process').spawn>
    })
    await invokeCli('codex' as AiSource, { ...baseInput, prompt: 'hello world' }, {
      getCliPath: async () => '/usr/local/bin/codex',
      spawnFn,
      timeoutMs: 5000,
    })
    expect(stdinWrites).toEqual(['hello world'])
    const call = spawnFn.mock.calls[0]
    // 第二個參數 args 不應包含 prompt 字面值
    expect(JSON.stringify(call[1])).not.toContain('hello world')
  })
})
