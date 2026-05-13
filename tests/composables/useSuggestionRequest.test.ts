import { describe, expect, it, vi } from 'vitest'

import { useSuggestionRequest } from '@/composables/useSuggestionRequest'
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

function makeResolver(adapters: Record<AiSource, AiAdapter>) {
  return createAiResolver({
    getParagraphBinding: () => undefined,
    getRoleBinding: () => undefined,
    getCharacterBinding: () => undefined,
    getGlobalDefault: () => 'codex',
    getAdapter: (s) => adapters[s],
  })
}

describe('useSuggestionRequest', () => {
  it('成功路徑：auditor clean → status=ok', async () => {
    const codex = makeAdapter(
      'codex',
      vi.fn(async () => ({ text: '回應', source: 'codex' as const, durationMs: 1 })),
    )
    const claude = makeAdapter(
      'claude',
      vi.fn(async () => ({ text: '', source: 'claude' as const, durationMs: 0 })),
    )
    const adapters: Record<AiSource, AiAdapter> = { codex, claude }
    const req = useSuggestionRequest({
      resolver: makeResolver(adapters),
      getAdapter: (s) => adapters[s],
      runAuditor: () => ({ kind: 'clean' }),
      promptFallback: async () => 'cancel',
    })
    const r = await req.invoke({
      invokeInput: { context: emptyContext, prompt: '', role: 'plot-driver' },
      query: { role: 'plot-driver' },
      context: emptyContext,
    })
    expect(r.status).toBe('ok')
    expect(r.text).toBe('回應')
  })

  it('CLI 失敗 → 使用者選 cancel → status=cancelled', async () => {
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
    const req = useSuggestionRequest({
      resolver: makeResolver(adapters),
      getAdapter: (s) => adapters[s],
      runAuditor: () => ({ kind: 'clean' }),
      promptFallback: async () => 'cancel',
    })
    const r = await req.invoke({
      invokeInput: { context: emptyContext, prompt: '', role: 'plot-driver' },
      query: { role: 'plot-driver' },
      context: emptyContext,
    })
    expect(r.status).toBe('cancelled')
  })

  it('auditor 偵測到 findings → status=findings', async () => {
    const codex = makeAdapter(
      'codex',
      vi.fn(async () => ({ text: '可疑回應', source: 'codex' as const, durationMs: 1 })),
    )
    const claude = makeAdapter(
      'claude',
      vi.fn(async () => ({ text: '', source: 'claude' as const, durationMs: 0 })),
    )
    const adapters: Record<AiSource, AiAdapter> = { codex, claude }
    const req = useSuggestionRequest({
      resolver: makeResolver(adapters),
      getAdapter: (s) => adapters[s],
      runAuditor: () => ({
        kind: 'findings',
        findings: [{ category: 'ooc', chapterId: 'ch1', evidence: '', severity: 'low' }],
      }),
      promptFallback: async () => 'cancel',
    })
    const r = await req.invoke({
      invokeInput: { context: emptyContext, prompt: '', role: 'plot-driver' },
      query: { role: 'plot-driver' },
      context: emptyContext,
    })
    expect(r.status).toBe('findings')
  })
})
