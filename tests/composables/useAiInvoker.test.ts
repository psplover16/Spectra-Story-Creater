import { describe, expect, it, vi } from 'vitest'

import { useAiInvoker } from '@/composables/useAiInvoker'
import { createAiResolver } from '@/services/ai/aiResolver'
import { CliUnavailableError } from '@/services/ai/errors'
import type { AiAdapter, AiSource, AssembledContext } from '@/types/ai'

const emptyContext: AssembledContext = {
  worldview: [],
  characters: [],
  overallPlot: { summary: '', chapters: [] },
  presentCharacters: [],
  chapterOutline: { chapterId: '', outline: '' },
  chapterScene: {
    chapterId: '',
    scene: { location: '', time: '', weather: '', props: [], mood: '' },
  },
}

function makeAdapter(source: AiSource, invoke: AiAdapter['invoke']): AiAdapter {
  return { source, invoke }
}

describe('useAiInvoker', () => {
  it('Codex 失敗 → 使用者選 switch 改 Claude → 成功', async () => {
    const codex = makeAdapter(
      'codex',
      vi.fn(async () => {
        throw new CliUnavailableError('codex')
      }),
    )
    const claude = makeAdapter(
      'claude',
      vi.fn(async () => ({ text: 'ok from claude', source: 'claude' as const, durationMs: 5 })),
    )
    const adapters: Record<AiSource, AiAdapter> = { codex, claude }

    const resolver = createAiResolver({
      getParagraphBinding: () => undefined,
      getRoleBinding: () => undefined,
      getCharacterBinding: () => undefined,
      getGlobalDefault: () => 'codex',
      getAdapter: (s) => adapters[s],
    })

    const promptFallback = vi.fn(async () => ({ action: 'switch' as const }))
    const invoker = useAiInvoker({
      resolver,
      getAdapter: (s) => adapters[s],
      promptFallback,
    })
    const outcome = await invoker.invoke(
      { context: emptyContext, prompt: 'hi', role: 'plot-driver' },
      { role: 'plot-driver' },
    )
    expect(outcome.status).toBe('ok')
    expect(outcome.result?.text).toBe('ok from claude')
    expect(outcome.triedSources).toEqual(['codex', 'claude'])
  })

  it('兩個 CLI 都 unavailable → 使用者第二次選 cancel → status=cancelled', async () => {
    const codex = makeAdapter(
      'codex',
      vi.fn(async () => {
        throw new CliUnavailableError('codex')
      }),
    )
    const claude = makeAdapter(
      'claude',
      vi.fn(async () => {
        throw new CliUnavailableError('claude')
      }),
    )
    const adapters: Record<AiSource, AiAdapter> = { codex, claude }
    const resolver = createAiResolver({
      getParagraphBinding: () => undefined,
      getRoleBinding: () => undefined,
      getCharacterBinding: () => undefined,
      getGlobalDefault: () => 'codex',
      getAdapter: (s) => adapters[s],
    })

    let calls = 0
    const promptFallback = vi.fn(async () => {
      calls++
      return { action: calls === 1 ? ('switch' as const) : ('cancel' as const) }
    })
    const invoker = useAiInvoker({
      resolver,
      getAdapter: (s) => adapters[s],
      promptFallback,
    })
    const outcome = await invoker.invoke(
      { context: emptyContext, prompt: 'hi', role: 'plot-driver' },
      { role: 'plot-driver' },
    )
    expect(outcome.status).toBe('cancelled')
    expect(outcome.triedSources).toEqual(['codex', 'claude'])
  })

  it('使用者直接 cancel → status=cancelled', async () => {
    const codex = makeAdapter(
      'codex',
      vi.fn(async () => {
        throw new CliUnavailableError('codex')
      }),
    )
    const claude = makeAdapter(
      'claude',
      vi.fn(async () => ({ text: '', source: 'claude' as const, durationMs: 0 })),
    )
    const adapters: Record<AiSource, AiAdapter> = { codex, claude }
    const resolver = createAiResolver({
      getParagraphBinding: () => undefined,
      getRoleBinding: () => undefined,
      getCharacterBinding: () => undefined,
      getGlobalDefault: () => 'codex',
      getAdapter: (s) => adapters[s],
    })
    const promptFallback = vi.fn(async () => ({ action: 'cancel' as const }))
    const invoker = useAiInvoker({
      resolver,
      getAdapter: (s) => adapters[s],
      promptFallback,
    })
    const outcome = await invoker.invoke(
      { context: emptyContext, prompt: 'hi', role: 'plot-driver' },
      { role: 'plot-driver' },
    )
    expect(outcome.status).toBe('cancelled')
  })
})
