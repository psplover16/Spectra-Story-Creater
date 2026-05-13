import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import FactionList from '@/components/faction/FactionList.vue'
import type { Faction } from '@/types/faction'

function f(id: string, name: string): Faction {
  return {
    id,
    name,
    alignment: 'neutral',
    description: '',
    currentSituation: '',
    keyMembers: [],
    createdAt: '',
    updatedAt: '',
  }
}

describe('FactionList', () => {
  it('顯示陣營清單，empty 時顯示提示', () => {
    const wrapper1 = mount(FactionList, {
      props: { factions: [f('t', '天地會')], activeFactionId: null },
    })
    expect(wrapper1.get('[data-testid="faction-list"]').text()).toContain('天地會')

    const wrapper2 = mount(FactionList, { props: { factions: [], activeFactionId: null } })
    expect(wrapper2.find('[data-testid="faction-empty"]').exists()).toBe(true)
  })

  it('點某個陣營後 emit select', async () => {
    const wrapper = mount(FactionList, {
      props: { factions: [f('t', '天地會')], activeFactionId: null },
    })
    await wrapper.get('[data-testid="faction-t"]').trigger('click')
    expect(wrapper.emitted('select')?.[0]).toEqual(['t'])
  })
})
