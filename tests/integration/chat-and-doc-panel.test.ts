import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'

import ChatPanel from '@/components/ai/ChatPanel.vue'
import DocumentEditPanel from '@/components/ai/DocumentEditPanel.vue'
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

function ad(source: AiSource, invoke: AiAdapter['invoke']): AiAdapter {
  return { source, invoke }
}

describe('integration: ChatPanel / DocumentEditPanel + useSuggestionRequest', () => {
  it('Chat 送出後從 mock adapter 收到回應；DocumentEditPanel 插入後可 undo', async () => {
    const codex = ad(
      'codex',
      vi.fn(async () => ({ text: '建議', source: 'codex' as const, durationMs: 1 })),
    )
    const claude = ad(
      'claude',
      vi.fn(async () => ({ text: '', source: 'claude' as const, durationMs: 0 })),
    )
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
      promptFallback: async () => 'cancel',
    })
    const result = await req.invoke({
      invokeInput: { context: emptyContext, prompt: 'hi', role: 'plot-driver' },
      query: { role: 'plot-driver' },
      context: emptyContext,
    })
    expect(result.status).toBe('ok')
    expect(result.text).toBe('建議')

    // 把建議插入到 DocumentEditPanel
    const doc = mount(DocumentEditPanel, { props: { initial: '韋小寶' } })
    const exposed = doc.vm as unknown as {
      applyAiInsertion: (insertion: string, caret: number) => void
      undo: () => void
      text: string
    }
    exposed.applyAiInsertion(result.text!, 3)
    expect(exposed.text).toBe('韋小寶建議')
    exposed.undo()
    expect(exposed.text).toBe('韋小寶')

    // CLI 失敗時，ChatPanel 預期由父層 catch fallback；本測試只驗證 chat send 動作 propagation
    const chat = mount(ChatPanel, { props: { messages: [] } })
    await chat.get('[data-testid="chat-input"]').setValue('幫忙描述')
    await chat.get('[data-testid="chat-send"]').trigger('submit')
    expect(chat.emitted('send')?.[0]).toEqual(['幫忙描述'])

    // CLI 失敗模擬：mock adapter 拋 CliUnavailableError，使用者 cancel
    const failedCodex = ad(
      'codex',
      vi.fn(async () => {
        throw new CliUnavailableError('codex')
      }),
    )
    const failedAdapters: Record<AiSource, AiAdapter> = { codex: failedCodex, claude }
    const failingReq = useSuggestionRequest({
      resolver: createAiResolver({
        getParagraphBinding: () => undefined,
        getRoleBinding: () => undefined,
        getCharacterBinding: () => undefined,
        getGlobalDefault: () => 'codex',
        getAdapter: (s) => failedAdapters[s],
      }),
      getAdapter: (s) => failedAdapters[s],
      runAuditor: () => ({ kind: 'clean' }),
      promptFallback: async () => 'cancel',
    })
    const failedResult = await failingReq.invoke({
      invokeInput: { context: emptyContext, prompt: '', role: 'plot-driver' },
      query: { role: 'plot-driver' },
      context: emptyContext,
    })
    expect(failedResult.status).toBe('cancelled')
  })
})
