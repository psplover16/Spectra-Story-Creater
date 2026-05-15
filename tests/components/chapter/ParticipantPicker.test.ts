import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import ParticipantPicker from '@/components/chapter/ParticipantPicker.vue'
import type { Character } from '@/types/character'

function ch(id: string, name: string): Character {
  return {
    id,
    name,
    personality: '',
    abilities: [],
    appearance: '',
    factionIds: [],
    socialStatus: '',
    relationships: [],
    notes: '',
    equipment: [],
    createdAt: '',
    updatedAt: '',
  }
}

describe('ParticipantPicker', () => {
  const characters = [ch('a', '韋小寶'), ch('b', '茅十八'), ch('c', '康熙')]

  it('勾選後 emit 含該 character id', async () => {
    const wrapper = mount(ParticipantPicker, {
      props: { characters, selectedCharacterIds: [] },
    })
    await wrapper.get('[data-testid="participant-check-a"]').setValue(true)
    const ids = wrapper.emitted('update')?.[0]?.[0] as string[]
    expect(ids).toEqual(['a'])
  })

  it('取消勾選後從清單移除', async () => {
    const wrapper = mount(ParticipantPicker, {
      props: { characters, selectedCharacterIds: ['a', 'b'] },
    })
    await wrapper.get('[data-testid="participant-check-a"]').setValue(false)
    const ids = wrapper.emitted('update')?.[0]?.[0] as string[]
    expect(ids).toEqual(['b'])
  })
})
