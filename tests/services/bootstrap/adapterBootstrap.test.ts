import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { bootstrapAdapters, type CliProbe } from '@/services/bootstrap/adapterBootstrap'
import { useAiSettingsStore } from '@/stores/aiSettings'

function probeReturning(codex: boolean, claude: boolean): CliProbe {
  return async () => ({ codex, claude })
}

describe('adapterBootstrap', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('兩個 CLI 皆可用：兩個 adapter 都建出、不丟例外、store 預設 codex', async () => {
    const result = await bootstrapAdapters({ probe: probeReturning(true, true) })
    expect(result.codex.source).toBe('codex')
    expect(result.claude.source).toBe('claude')
    expect(result.availability).toEqual({ codex: true, claude: true })
    const store = useAiSettingsStore()
    expect(store.binding.globalDefault).toBe('codex')
  })

  it('只有 codex 可用：bootstrap 不丟、globalDefault 維持 codex', async () => {
    const result = await bootstrapAdapters({ probe: probeReturning(true, false) })
    expect(result.codex.source).toBe('codex')
    expect(result.claude.source).toBe('claude')
    expect(result.availability).toEqual({ codex: true, claude: false })
    const store = useAiSettingsStore()
    expect(store.binding.globalDefault).toBe('codex')
  })

  it('只有 claude 可用：bootstrap 不丟、globalDefault 自動切到 claude', async () => {
    const result = await bootstrapAdapters({ probe: probeReturning(false, true) })
    expect(result.availability).toEqual({ codex: false, claude: true })
    const store = useAiSettingsStore()
    expect(store.binding.globalDefault).toBe('claude')
  })

  it('兩個 CLI 皆不可用：bootstrap 仍成功完成、不丟例外、adapter 仍建出', async () => {
    const result = await bootstrapAdapters({ probe: probeReturning(false, false) })
    expect(result.codex.source).toBe('codex')
    expect(result.claude.source).toBe('claude')
    expect(result.availability).toEqual({ codex: false, claude: false })
  })

  it('probe 自身丟例外：bootstrap 仍成功完成（不向上拋）、availability 為 unknown', async () => {
    const exploding: CliProbe = async () => {
      throw new Error('boom')
    }
    const result = await bootstrapAdapters({ probe: exploding })
    expect(result.availability).toEqual({ codex: 'unknown', claude: 'unknown' })
    expect(result.codex.source).toBe('codex')
    expect(result.claude.source).toBe('claude')
  })

  it('不傳 probe：預設視為兩 CLI 皆可用（trust by default，由 ai:invoke 在點擊時報錯）', async () => {
    const result = await bootstrapAdapters({})
    expect(result.availability).toEqual({ codex: true, claude: true })
  })

  it('adapter.invoke 走 window.api.ai.invoke 既有 channel，並傳 source 為第一參數', async () => {
    const fakeInvoke = vi.fn(async (_source: string, _input: unknown) => ({
      text: 'hello',
      source: 'codex' as const,
      durationMs: 1,
    }))
    ;(globalThis as unknown as { window: unknown }).window = {
      api: {
        ai: { invoke: fakeInvoke },
      },
    }

    const { codex } = await bootstrapAdapters({ probe: probeReturning(true, true) })
    const out = await codex.invoke({
      context: {
        worldview: [],
        characters: [],
        overallPlot: { summary: '', chapters: [] },
        presentCharacters: [],
        chapterOutline: { chapterId: 'c1', outline: '' },
        chapterScene: {
          chapterId: 'c1',
          scene: { time: '', location: '', weather: '', props: [], mood: '' },
        },
      },
      prompt: 'hi',
      role: 'plot-driver',
    })
    expect(fakeInvoke).toHaveBeenCalledTimes(1)
    expect(fakeInvoke.mock.calls[0]?.[0]).toBe('codex')
    expect(out.text).toBe('hello')
  })

  it('createRendererAdapter("claude") 呼叫 invoke 時 source 為 claude', async () => {
    const fakeInvoke = vi.fn(async (_source: string, _input: unknown) => ({
      text: 'claude reply',
      source: 'claude' as const,
      durationMs: 1,
    }))
    ;(globalThis as unknown as { window: unknown }).window = {
      api: {
        ai: { invoke: fakeInvoke },
      },
    }

    const { claude } = await bootstrapAdapters({ probe: probeReturning(true, true) })
    await claude.invoke({
      context: {
        worldview: [],
        characters: [],
        overallPlot: { summary: '', chapters: [] },
        presentCharacters: [],
        chapterOutline: { chapterId: 'c1', outline: '' },
        chapterScene: {
          chapterId: 'c1',
          scene: { time: '', location: '', weather: '', props: [], mood: '' },
        },
      },
      prompt: 'hi',
      role: 'plot-driver',
    })
    expect(fakeInvoke.mock.calls[0]?.[0]).toBe('claude')
  })
})
