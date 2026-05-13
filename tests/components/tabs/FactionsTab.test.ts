import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import FactionsTab from '@/components/tabs/FactionsTab.vue'
import type { Faction } from '@/types/faction'

function makeFaction(overrides: Partial<Faction> & { id: string; name: string }): Faction {
  return {
    alignment: 'neutral',
    description: '',
    currentSituation: '',
    keyMembers: [],
    createdAt: '2026-05-13T00:00:00.000Z',
    updatedAt: '2026-05-13T00:00:00.000Z',
    ...overrides,
  }
}

function setupApi(initialFactions: Faction[]) {
  const faction = {
    list: vi.fn(async () => initialFactions),
    read: vi.fn(async (_n: string, id: string) => initialFactions.find((f) => f.id === id) ?? null),
    write: vi.fn(async () => undefined),
    delete: vi.fn(async () => undefined),
  }
  const character = {
    list: vi.fn(async () => []),
    read: vi.fn(),
    write: vi.fn(),
    delete: vi.fn(),
  }
  ;(window as unknown as { api: unknown }).api = { faction, character }
  return { faction, character }
}

async function flush(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0))
}

describe('FactionsTab', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('mount 時呼叫 faction.list 並傳入 novelId', async () => {
    const api = setupApi([])
    mount(FactionsTab, { props: { novelId: 'n1' } })
    await flush()
    expect(api.faction.list).toHaveBeenCalledWith('n1')
  })

  it('選擇某 faction 後編輯並送出 → 呼叫 faction.write', async () => {
    const factions = [makeFaction({ id: 'f1', name: '天地會' })]
    const api = setupApi(factions)
    const wrapper = mount(FactionsTab, { props: { novelId: 'n1' } })
    await flush()
    await wrapper.get('[data-testid="faction-f1"]').trigger('click')
    await flush()
    await wrapper.get('[data-testid="faction-name"]').setValue('天地會 v2')
    await wrapper.get('form[data-testid="faction-editor"]').trigger('submit.prevent')
    await flush()
    expect(api.faction.write).toHaveBeenCalledTimes(1)
    expect(api.faction.write).toHaveBeenCalledWith(
      'n1',
      expect.objectContaining({ name: '天地會 v2' }),
    )
  })

  it('按下「成員視圖」按鈕後 members 視圖可見、預設不可見', async () => {
    const factions = [makeFaction({ id: 'f1', name: '天地會' })]
    setupApi(factions)
    const wrapper = mount(FactionsTab, { props: { novelId: 'n1' } })
    await flush()
    await wrapper.get('[data-testid="faction-f1"]').trigger('click')
    await flush()
    expect(wrapper.find('[data-testid="faction-members"]').exists()).toBe(false)
    await wrapper.get('[data-testid="faction-toggle-members"]').trigger('click')
    expect(wrapper.find('[data-testid="faction-members"]').exists()).toBe(true)
    await wrapper.get('[data-testid="faction-toggle-members"]').trigger('click')
    expect(wrapper.find('[data-testid="faction-members"]').exists()).toBe(false)
  })
})
