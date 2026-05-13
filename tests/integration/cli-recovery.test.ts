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

describe('integration: CLI recovery — Codex 失敗 → 使用者選 Claude → 成功', () => {
  it('完整三步驟', async () => {
    const codex: AiAdapter = {
      source: 'codex' as const,
      invoke: vi.fn(async () => {
        throw new CliUnavailableError('codex')
      }),
    }
    const claude: AiAdapter = {
      source: 'claude' as const,
      invoke: vi.fn(async () => ({ text: 'success', source: 'claude' as const, durationMs: 1 })),
    }
    const adapters: Record<AiSource, AiAdapter> = { codex, claude }
    const req = useSuggestionRequest({
      resolver: createAiResolver({
        getParagraphBinding: () => undefined,
        getRoleBinding: () => undefined,
        getCharacterBinding: () => undefined,
        getGlobalDefault: () => 'codex',
        getAdapter: (s) => adapters[s],
      }),
      getAdapter: (s) => adapters[s],
      runAuditor: () => ({ kind: 'clean' }),
      promptFallback: async () => 'switch',
    })
    const result = await req.invoke({
      invokeInput: { context: emptyContext, prompt: '', role: 'plot-driver' },
      query: { role: 'plot-driver' },
      context: emptyContext,
    })
    expect(result.status).toBe('ok')
    expect(result.source).toBe('claude')
  })
})
