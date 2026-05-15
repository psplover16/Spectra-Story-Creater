import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import EquipmentList from '@/components/equipment/EquipmentList.vue'
import type { EquipmentItem } from '@/types/equipment'

const items: EquipmentItem[] = [
  { id: 'eq-yu', name: '玉佩', kind: 'wearable', defaultEffect: '飾品' },
  { id: 'eq-poison', name: '毒藥', kind: 'consumable', defaultEffect: '致命' },
]

describe('EquipmentList', () => {
  it('渲染每件裝備 name 與 kind', () => {
    const wrapper = mount(EquipmentList, { props: { items } })
    expect(wrapper.text()).toContain('玉佩')
    expect(wrapper.text()).toContain('wearable')
    expect(wrapper.text()).toContain('毒藥')
    expect(wrapper.text()).toContain('consumable')
  })

  it('點擊某件裝備 → emit select 帶 equipmentId', async () => {
    const wrapper = mount(EquipmentList, { props: { items } })
    await wrapper.get('[data-testid="equipment-row-eq-yu"]').trigger('click')
    const evts = wrapper.emitted('select')
    expect(evts).toBeTruthy()
    expect(evts?.[0]).toEqual(['eq-yu'])
  })
})
