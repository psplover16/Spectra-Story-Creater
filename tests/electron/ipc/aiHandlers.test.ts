import { describe, expect, it, vi } from 'vitest'

import { createAiHandlers } from '../../../electron/ipc/aiHandlers'
import type { AiInvokeInput } from '@/types/ai'

const fakeInput: AiInvokeInput = {
  context: {
    worldview: [],
    characters: [],
    overallPlot: { summary: '', chapters: [] },
    presentCharacters: [],
    chapterOutline: { chapterId: '', outline: '' },
    chapterScene: {
      chapterId: '',
      scene: { location: '', time: '', weather: '', props: [], mood: '' },
    },
  },
  prompt: '',
  role: 'plot-driver',
}

describe('aiHandlers', () => {
  it('invoke 走通 deps.invoke', async () => {
    const invoke = vi.fn(async () => ({
      text: '回應',
      source: 'codex' as const,
      durationMs: 1,
    }))
    const handlers = createAiHandlers({ invoke })
    const r = await handlers.invoke('codex', fakeInput)
    expect(r.text).toBe('回應')
    expect(invoke).toHaveBeenCalled()
  })

  it('dryRun 在資料不足時回 inconclusive', () => {
    const handlers = createAiHandlers({
      invoke: vi.fn(),
    })
    const result = handlers.dryRun({
      candidateResponse: '',
      chapterId: 'ch1',
      chapterIndex: 1,
      presentCharacters: [],
      worldview: [],
      deceasedCharacterIds: [],
      context: fakeInput.context,
      mutes: [],
    })
    expect(result.kind).toBe('inconclusive')
  })
})
