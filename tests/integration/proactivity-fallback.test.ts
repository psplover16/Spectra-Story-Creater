import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { useAiSettingsStore } from '@/stores/aiSettings'

describe('integration: proactivity 三層 fallback 在實際 store 下行為', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('character → novel → global 三層 fallback 與「跟隨上層」一致', () => {
    const store = useAiSettingsStore()
    store.setGlobalProactivity('strong')
    expect(store.resolveProactivity({ novelId: 'n1', characterId: null })).toBe('strong')

    store.setNovelProactivity('n1', 'medium')
    expect(store.resolveProactivity({ novelId: 'n1', characterId: null })).toBe('medium')

    store.setCharacterProactivity('c1', 'weak')
    expect(store.resolveProactivity({ novelId: 'n1', characterId: 'c1' })).toBe('weak')

    store.setCharacterProactivity('c1', 'inherit')
    expect(store.resolveProactivity({ novelId: 'n1', characterId: 'c1' })).toBe('medium')

    store.setNovelProactivity('n1', 'inherit')
    expect(store.resolveProactivity({ novelId: 'n1', characterId: 'c1' })).toBe('strong')
  })
})
