import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { useAiSettingsStore } from '@/stores/aiSettings'

describe('aiSettings store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('binding 寫入 / fallback 路徑', () => {
    it('未綁定時回 globalDefault', () => {
      const store = useAiSettingsStore()
      const result = store.resolveAiSource({ role: 'plot-driver' })
      expect(result.source).toBe('codex')
      expect(result.hitLayer).toBe('global')
    })

    it('段落覆寫優先於 role / character / global', () => {
      const store = useAiSettingsStore()
      store.setRoleBinding('plot-driver', 'codex')
      store.setCharacterBinding('韋小寶', 'codex')
      store.setParagraphBinding('p-42', 'claude')
      const result = store.resolveAiSource({
        role: 'plot-driver',
        characterId: '韋小寶',
        paragraphId: 'p-42',
      })
      expect(result.source).toBe('claude')
      expect(result.hitLayer).toBe('paragraph')
    })

    it('清掉段落綁定後回到 role layer', () => {
      const store = useAiSettingsStore()
      store.setRoleBinding('character-voice', 'claude')
      store.setParagraphBinding('p-1', 'codex')
      store.setParagraphBinding('p-1', null)
      const result = store.resolveAiSource({ role: 'character-voice', paragraphId: 'p-1' })
      expect(result.source).toBe('claude')
      expect(result.hitLayer).toBe('role')
    })
  })

  describe('proactivity 三層 fallback', () => {
    it('未設定時用全域 medium', () => {
      const store = useAiSettingsStore()
      expect(store.resolveProactivity({ novelId: 'n1', characterId: null })).toBe('medium')
    })

    it('角色「跟隨上層」時回退到小說，小說「跟隨上層」時回退到全域', () => {
      const store = useAiSettingsStore()
      store.setGlobalProactivity('strong')
      store.setNovelProactivity('n1', 'inherit')
      store.setCharacterProactivity('c1', 'inherit')
      expect(store.resolveProactivity({ novelId: 'n1', characterId: 'c1' })).toBe('strong')
    })

    it('角色設「關」時最具體層級勝出', () => {
      const store = useAiSettingsStore()
      store.setGlobalProactivity('strong')
      store.setCharacterProactivity('c1', 'off')
      expect(store.resolveProactivity({ novelId: 'n1', characterId: 'c1' })).toBe('off')
    })
  })
})
