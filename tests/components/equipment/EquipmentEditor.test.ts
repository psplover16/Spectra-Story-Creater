import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import EquipmentEditor from '@/components/equipment/EquipmentEditor.vue'

describe('EquipmentEditor', () => {
  it('填寫 name/kind/defaultEffect 後 emit save 帶完整 EquipmentItem', async () => {
    const wrapper = mount(EquipmentEditor)
    await wrapper.get('[data-testid="equipment-editor-name"]').setValue('玉佩')
    await wrapper.get('[data-testid="equipment-editor-kind"]').setValue('wearable')
    await wrapper.get('[data-testid="equipment-editor-default-effect"]').setValue('飾品')
    await wrapper.get('[data-testid="equipment-editor-save"]').trigger('submit')
    const saved = wrapper.emitted('save')?.[0]?.[0] as {
      name: string
      kind: string
      defaultEffect: string
    }
    expect(saved.name).toBe('玉佩')
    expect(saved.kind).toBe('wearable')
    expect(saved.defaultEffect).toBe('飾品')
  })

  it('kind dropdown 含三個合法選項', () => {
    const wrapper = mount(EquipmentEditor)
    const options = wrapper.findAll('[data-testid="equipment-editor-kind"] option')
    const values = options.map((o) => (o.element as HTMLOptionElement).value)
    expect(values).toContain('wearable')
    expect(values).toContain('consumable')
    expect(values).toContain('misc')
  })
})
