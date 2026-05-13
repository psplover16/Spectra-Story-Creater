import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

import ProactivitySettings from '@/components/ai/ProactivitySettings.vue'
import { useAiSettingsStore } from '@/stores/aiSettings'

describe('ProactivitySettings', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('改全域層級 → store 同步更新', async () => {
    const wrapper = mount(ProactivitySettings, {
      props: { novelId: 'n1', characterId: null },
    })
    const store = useAiSettingsStore()
    await wrapper.get('[data-testid="proactivity-global"]').setValue('strong')
    expect(store.proactivity.global).toBe('strong')
  })

  it('改小說層級 → store.perNovel 同步更新', async () => {
    const wrapper = mount(ProactivitySettings, {
      props: { novelId: 'n1', characterId: null },
    })
    const store = useAiSettingsStore()
    await wrapper.get('[data-testid="proactivity-novel"]').setValue('weak')
    expect(store.proactivity.perNovel['n1']).toBe('weak')
  })
})
