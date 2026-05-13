import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import CollaborationModeGate from '@/components/tabs/CollaborationModeGate.vue'
import { loadWorkspaceState } from '@/services/files/workspaceStateRepository'
import type { CollaborationMode } from '@/types/collaboration'

function createMemoryStorage(): Storage {
  const data = new Map<string, string>()
  return {
    get length() {
      return data.size
    },
    clear: () => data.clear(),
    getItem: (k: string) => (data.has(k) ? (data.get(k) as string) : null),
    key: (i: number) => Array.from(data.keys())[i] ?? null,
    removeItem: (k: string) => {
      data.delete(k)
    },
    setItem: (k: string, v: string) => {
      data.set(k, v)
    },
  } as Storage
}

describe('CollaborationModeGate', () => {
  let storage: Storage

  beforeEach(() => {
    setActivePinia(createPinia())
    storage = createMemoryStorage()
  })

  const MODES: CollaborationMode[] = ['companion', 'ghostwriter', 'auto']

  for (const mode of MODES) {
    it(`點選 ${mode} → emit mode-selected 帶 mode 值且 workspaceState 持久化`, async () => {
      const wrapper = mount(CollaborationModeGate, {
        props: {
          workspacePath: '/tmp/ws',
          activeNovelName: 'demo',
          storage,
        },
      })
      await wrapper.get(`[data-testid="collab-mode-${mode}"]`).trigger('click')
      const emitted = wrapper.emitted('mode-selected')
      expect(emitted).toBeTruthy()
      expect(emitted?.[0]).toEqual([mode])

      const persisted = loadWorkspaceState(storage)
      expect(persisted).not.toBeNull()
      expect(persisted?.collaborationMode).toBe(mode)
      expect(persisted?.workspacePath).toBe('/tmp/ws')
      expect(persisted?.activeNovelName).toBe('demo')
    })
  }

  it('workspacePath 為 undefined（pre-workspace-pick）時仍可儲存，workspacePath 視為 ""', async () => {
    const wrapper = mount(CollaborationModeGate, {
      props: { storage },
    })
    await wrapper.get('[data-testid="collab-mode-companion"]').trigger('click')
    const persisted = loadWorkspaceState(storage)
    expect(persisted).not.toBeNull()
    expect(persisted?.workspacePath).toBe('')
    expect(persisted?.activeNovelName).toBeNull()
    expect(persisted?.collaborationMode).toBe('companion')
  })
})
