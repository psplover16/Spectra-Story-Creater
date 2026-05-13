import { describe, expect, it, vi } from 'vitest'

import { useSuggestionRequest } from '@/composables/useSuggestionRequest'
import { createAiResolver } from '@/services/ai/aiResolver'
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

function ad(source: AiSource, text: string): AiAdapter {
  return {
    source,
    invoke: vi.fn(async () => ({ text, source, durationMs: 1 })),
  }
}

describe('integration: useAiInvoker + auditor 三狀態', () => {
  it('clean / findings / inconclusive 三路徑分別 propagate 為 status', async () => {
    const adapters: Record<AiSource, AiAdapter> = {
      codex: ad('codex', 'plain response'),
      claude: ad('claude', ''),
    }
    const resolver = createAiResolver({
      getParagraphBinding: () => undefined,
      getRoleBinding: () => undefined,
      getCharacterBinding: () => undefined,
      getGlobalDefault: () => 'codex',
      getAdapter: (s) => adapters[s],
    })

    for (const variant of ['clean', 'findings', 'inconclusive'] as const) {
      const req = useSuggestionRequest({
        resolver,
        getAdapter: (s) => adapters[s],
        runAuditor: () => {
          if (variant === 'clean') return { kind: 'clean' }
          if (variant === 'findings')
            return {
              kind: 'findings',
              findings: [{ category: 'ooc', chapterId: 'ch1', evidence: '', severity: 'low' }],
            }
          return {
            kind: 'inconclusive',
            details: { reason: '不足', missingSlices: ['characters'] },
          }
        },
        promptFallback: async () => 'cancel',
      })
      const result = await req.invoke({
        invokeInput: { context: emptyContext, prompt: '', role: 'plot-driver' },
        query: { role: 'plot-driver' },
        context: emptyContext,
      })
      const expected =
        variant === 'clean' ? 'ok' : variant === 'findings' ? 'findings' : 'inconclusive'
      expect(result.status).toBe(expected)
    }
  })
})
