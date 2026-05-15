import { mount, flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import EquipmentTab from '@/components/tabs/EquipmentTab.vue'
import type { EquipmentItem } from '@/types/equipment'

function setupApi(initial: EquipmentItem[]) {
  const api = {
    equipment: {
      list: vi.fn(async () => initial),
      read: vi.fn(async () => null),
      write: vi.fn(async (_dir: string, item: EquipmentItem) => item),
      delete: vi.fn(async () => undefined),
    },
  }
  ;(window as unknown as { api: unknown }).api = api
  return api
}

describe('EquipmentTab', () => {
  beforeEach(() => {
    delete (window as unknown as { api?: unknown }).api
  })

  it('mount 時呼叫 equipment.list 並渲染清單', async () => {
    const api = setupApi([
      { id: 'eq-yu', name: '玉佩', kind: 'wearable', defaultEffect: '飾品' } as EquipmentItem,
    ])
    const wrapper = mount(EquipmentTab, { props: { novelDir: 'n1' } })
    await flushPromises()
    expect(api.equipment.list).toHaveBeenCalledWith('n1')
    expect(wrapper.text()).toContain('玉佩')
  })

  it('新增按鈕觸發後填寫 → 呼叫 equipment.write', async () => {
    const api = setupApi([])
    const wrapper = mount(EquipmentTab, { props: { novelDir: 'n1' } })
    await flushPromises()
    await wrapper.get('[data-testid="equipment-tab-add"]').trigger('click')
    await wrapper.get('[data-testid="equipment-editor-name"]').setValue('新裝備')
    await wrapper.get('[data-testid="equipment-editor-kind"]').setValue('misc')
    await wrapper.get('[data-testid="equipment-editor-default-effect"]').setValue('普通')
    await wrapper.get('[data-testid="equipment-editor-save"]').trigger('submit')
    await flushPromises()
    expect(api.equipment.write).toHaveBeenCalledTimes(1)
    const [novelDir, payload] = api.equipment.write.mock.calls[0] as [string, EquipmentItem]
    expect(novelDir).toBe('n1')
    expect(payload.name).toBe('新裝備')
  })

  it('刪除按鈕觸發 → 呼叫 equipment.delete 並 reload', async () => {
    const api = setupApi([
      { id: 'eq-temp', name: '臨時', kind: 'misc', defaultEffect: '' } as EquipmentItem,
    ])
    const wrapper = mount(EquipmentTab, { props: { novelDir: 'n1' } })
    await flushPromises()
    await wrapper.get('[data-testid="equipment-delete-eq-temp"]').trigger('click')
    await flushPromises()
    expect(api.equipment.delete).toHaveBeenCalledWith('n1', 'eq-temp')
  })
})
