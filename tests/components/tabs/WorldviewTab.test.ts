import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import WorldviewTab from '@/components/tabs/WorldviewTab.vue'
import type { Novel } from '@/types/novel'

function makeNovel(overrides: Partial<Novel> = {}): Novel {
  return {
    id: 'n1',
    name: '範例小說',
    style: '',
    worldview: [],
    factionsSummary: [],
    overallOutline: { summary: '', chapters: [] },
    createdAt: '2026-05-13T00:00:00.000Z',
    updatedAt: '2026-05-13T00:00:00.000Z',
    ...overrides,
  }
}

function setupApi(novel: Novel) {
  const api = {
    novel: {
      read: vi.fn(async () => novel),
      write: vi.fn(async () => undefined),
    },
  }
  ;(window as unknown as { api: unknown }).api = api
  return api
}

async function flush(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0))
}

describe('WorldviewTab', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('mount 時呼叫 novel.read 並傳入 novelDir', async () => {
    const api = setupApi(makeNovel())
    mount(WorldviewTab, { props: { novelDir: 'n1' } })
    await flush()
    expect(api.novel.read).toHaveBeenCalledWith('n1')
  })

  it('新增條目後 → 呼叫 novel.write 並 payload 帶完整 novel 物件，worldview 反映新內容', async () => {
    const novel = makeNovel({ name: '我的世界', style: '輕鬆' })
    const api = setupApi(novel)
    const wrapper = mount(WorldviewTab, { props: { novelDir: 'n1' } })
    await flush()
    await wrapper.get('[data-testid="worldview-new-title"]').setValue('魔法系統')
    await wrapper.get('[data-testid="worldview-new-content"]').setValue('元素四系。')
    await wrapper.get('[data-testid="worldview-add"]').trigger('click')
    await flush()
    expect(api.novel.write).toHaveBeenCalledTimes(1)
    const [novelDir, payload] = api.novel.write.mock.calls[0] as unknown as [string, Novel]
    expect(novelDir).toBe('n1')
    expect(payload.name).toBe('我的世界')
    expect(payload.style).toBe('輕鬆')
    expect(payload.worldview).toHaveLength(1)
    expect(payload.worldview[0]?.title).toBe('魔法系統')
    expect(payload.worldview[0]?.content).toBe('元素四系。')
  })

  it('novel.write payload 必須是可被 structuredClone 的純物件（contextBridge 邊界）', async () => {
    const novel = makeNovel()
    const api = setupApi(novel)
    const wrapper = mount(WorldviewTab, { props: { novelDir: 'n1' } })
    await flush()
    await wrapper.get('[data-testid="worldview-new-title"]').setValue('魔法系統')
    await wrapper.get('[data-testid="worldview-add"]').trigger('click')
    await flush()
    const [, payload] = api.novel.write.mock.calls[0] as unknown as [string, unknown]
    expect(() => structuredClone(payload)).not.toThrow()
  })

  it('更新既有條目後 → novel.write payload worldview 反映新值', async () => {
    const novel = makeNovel({
      worldview: [{ id: 'wv-1', title: '原標題', content: '原內容' }],
    })
    const api = setupApi(novel)
    const wrapper = mount(WorldviewTab, { props: { novelDir: 'n1' } })
    await flush()
    const titleInput = wrapper.get('[data-testid="worldview-title-wv-1"]')
    await titleInput.setValue('新標題')
    await flush()
    expect(api.novel.write).toHaveBeenCalled()
    const lastCall = api.novel.write.mock.calls[
      api.novel.write.mock.calls.length - 1
    ] as unknown as [string, Novel]
    expect(lastCall[1].worldview[0]?.title).toBe('新標題')
  })
})
