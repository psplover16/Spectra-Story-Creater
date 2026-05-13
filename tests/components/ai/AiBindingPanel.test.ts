import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

import AiBindingPanel from '@/components/ai/AiBindingPanel.vue'
import { useAiSettingsStore } from '@/stores/aiSettings'

describe('AiBindingPanel', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('改全域預設 → store.binding.globalDefault 同步更新，resolver 命中 global', async () => {
    const wrapper = mount(AiBindingPanel)
    const store = useAiSettingsStore()
    await wrapper.get('[data-testid="binding-global"]').setValue('claude')
    expect(store.binding.globalDefault).toBe('claude')
    expect(store.resolveAiSource({ role: 'plot-driver' }).hitLayer).toBe('global')
  })

  it('設職能綁定 → resolver 命中 role 層', async () => {
    const wrapper = mount(AiBindingPanel)
    const store = useAiSettingsStore()
    await wrapper.get('[data-testid="binding-role-plot-driver"]').setValue('claude')
    const res = store.resolveAiSource({ role: 'plot-driver' })
    expect(res.hitLayer).toBe('role')
    expect(res.source).toBe('claude')
  })
})
