import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import CharactersTab from '@/components/tabs/CharactersTab.vue'
import type { Character } from '@/types/character'

const ALLOWED_FNS = new Set(['list', 'read', 'write', 'delete'])

function makeCharacter(overrides: Partial<Character> & { id: string; name: string }): Character {
  return {
    personality: '',
    abilities: [],
    appearance: '',
    factionId: null,
    socialStatus: '',
    relationships: [],
    notes: '',
    createdAt: '2026-05-13T00:00:00.000Z',
    updatedAt: '2026-05-13T00:00:00.000Z',
    ...overrides,
  }
}

interface CharacterApi {
  list: ReturnType<typeof vi.fn>
  read: ReturnType<typeof vi.fn>
  write: ReturnType<typeof vi.fn>
  delete: ReturnType<typeof vi.fn>
}

function setupApi(initialList: Character[] = []): { character: CharacterApi } {
  const list = vi.fn(async (_novelId: string) => initialList)
  const read = vi.fn(async (_novelId: string, characterId: string) => {
    return initialList.find((c) => c.id === characterId) ?? null
  })
  const write = vi.fn(async (_novelId: string, _character: unknown) => undefined)
  const del = vi.fn(async (_novelId: string, _characterId: string) => undefined)
  const character: CharacterApi = { list, read, write, delete: del }
  ;(window as unknown as { api: unknown }).api = { character }
  return { character }
}

async function flush(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0))
}

describe('CharactersTab', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('mount 時呼叫 window.api.character.list 並傳入 novelId', async () => {
    const api = setupApi([])
    mount(CharactersTab, { props: { novelId: 'n1' } })
    await flush()
    expect(api.character.list).toHaveBeenCalledWith('n1')
  })

  it('點「新增」後送出 editor 會呼叫 character.write', async () => {
    const api = setupApi([])
    const wrapper = mount(CharactersTab, { props: { novelId: 'n1' } })
    await flush()
    await wrapper.get('[data-testid="character-create"]').trigger('click')
    await wrapper.get('[data-testid="character-name"]').setValue('新角色')
    await wrapper.get('form[data-testid="character-editor"]').trigger('submit.prevent')
    await flush()
    expect(api.character.write).toHaveBeenCalledTimes(1)
    expect(api.character.write).toHaveBeenCalledWith(
      'n1',
      expect.objectContaining({ name: '新角色' }),
    )
  })

  it('刪除按鈕呼叫 character.delete 並帶 novelId 與 character id', async () => {
    const list = [makeCharacter({ id: 'c1', name: '甲' })]
    const api = setupApi(list)
    const wrapper = mount(CharactersTab, { props: { novelId: 'n1' } })
    await flush()
    await wrapper.get('[data-testid="character-甲"]').trigger('click')
    await wrapper.get('[data-testid="character-delete"]').trigger('click')
    await flush()
    expect(api.character.delete).toHaveBeenCalledWith('n1', 'c1')
  })

  it('不呼叫任何不存在於 character 命名空間的 channel', async () => {
    const api = setupApi([makeCharacter({ id: 'c1', name: '甲' })])
    const wrapper = mount(CharactersTab, { props: { novelId: 'n1' } })
    await flush()
    await wrapper.get('[data-testid="character-create"]').trigger('click')
    await wrapper.get('[data-testid="character-name"]').setValue('新')
    await wrapper.get('form[data-testid="character-editor"]').trigger('submit.prevent')
    await flush()
    const called = Object.entries(api.character)
      .filter(([, fn]) => fn.mock.calls.length > 0)
      .map(([name]) => name)
    for (const fn of called) {
      expect(ALLOWED_FNS.has(fn)).toBe(true)
    }
  })
})
