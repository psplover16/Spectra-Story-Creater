import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import FactionEditor from '@/components/faction/FactionEditor.vue'
import type { Faction } from '@/types/faction'

const base: Faction = {
  id: 't',
  name: '天地會',
  alignment: 'protagonist',
  description: '反清復明',
  currentSituation: '勢力初成',
  keyMembers: [],
  createdAt: '',
  updatedAt: '',
}

describe('FactionEditor', () => {
  it('happy save emit draft', async () => {
    const wrapper = mount(FactionEditor, { props: { faction: null } })
    await wrapper.get('[data-testid="faction-name"]').setValue('天地會')
    await wrapper.get('[data-testid="faction-save"]').trigger('submit')
    expect(wrapper.emitted('save')).toHaveLength(1)
    const emitted = wrapper.emitted('save')?.[0]?.[0] as { name: string; alignment: string }
    expect(emitted.name).toBe('天地會')
    expect(emitted.alignment).toBe('neutral')
  })

  it('傳入既有 faction 時欄位預填', () => {
    const wrapper = mount(FactionEditor, { props: { faction: base } })
    const name = wrapper.get<HTMLInputElement>('[data-testid="faction-name"]').element
      .value as string
    expect(name).toBe('天地會')
  })
})
