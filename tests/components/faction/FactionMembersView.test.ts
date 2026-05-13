import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import FactionMembersView from '@/components/faction/FactionMembersView.vue'
import type { Character } from '@/types/character'

function ch(id: string, name: string, factionId: string | null): Character {
  return {
    id,
    name,
    personality: '',
    abilities: [],
    appearance: '',
    factionId,
    socialStatus: '',
    relationships: [],
    notes: '',
    createdAt: '',
    updatedAt: '',
  }
}

describe('FactionMembersView', () => {
  it('動態反映 character.factionId 變動：第三位角色加入後成員數為 3', async () => {
    const characters = [ch('a', '韋小寶', 'tdh'), ch('b', '茅十八', 'tdh')]
    const wrapper = mount(FactionMembersView, {
      props: { factionId: 'tdh', characters },
    })
    expect(wrapper.text()).toContain('成員（2）')

    await wrapper.setProps({
      factionId: 'tdh',
      characters: [...characters, ch('c', '吳六奇', 'tdh')],
    })
    expect(wrapper.text()).toContain('成員（3）')
    expect(wrapper.find('[data-testid="member-吳六奇"]').exists()).toBe(true)
  })
})
