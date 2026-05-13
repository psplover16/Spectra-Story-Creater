import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import CharacterList from '@/components/character/CharacterList.vue'
import type { Character } from '@/types/character'

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

describe('CharacterList', () => {
  const chars: Character[] = [
    makeCharacter({ id: '1', name: '韋小寶', factionId: 'tdh' }),
    makeCharacter({ id: '2', name: '茅十八', factionId: 'tdh' }),
    makeCharacter({ id: '3', name: '康熙', factionId: 'court' }),
    makeCharacter({ id: '4', name: '神祕浪人', factionId: null }),
  ]

  it('factionFilter 為某 faction 時，只回傳該 faction 的角色', () => {
    const wrapper = mount(CharacterList, { props: { characters: chars, factionFilter: 'tdh' } })
    const list = wrapper.get('[data-testid="character-list"]').text()
    expect(list).toContain('韋小寶')
    expect(list).toContain('茅十八')
    expect(list).not.toContain('康熙')
    expect(list).not.toContain('神祕浪人')
  })

  it('factionFilter 為 __none__ 時，只回傳無陣營角色', () => {
    const wrapper = mount(CharacterList, {
      props: { characters: chars, factionFilter: '__none__' },
    })
    const list = wrapper.get('[data-testid="character-list"]').text()
    expect(list).toContain('神祕浪人')
    expect(list).not.toContain('韋小寶')
    expect(list).not.toContain('康熙')
  })
})
