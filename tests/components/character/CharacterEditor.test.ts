import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import CharacterEditor from '@/components/character/CharacterEditor.vue'

describe('CharacterEditor', () => {
  it('happy save：輸入 name 後 emit save 含全部欄位', async () => {
    const wrapper = mount(CharacterEditor)
    await wrapper.get('[data-testid="character-name"]').setValue('韋小寶')
    await wrapper.get('[data-testid="character-personality"]').setValue('機靈狡黠')
    await wrapper.get('[data-testid="character-save"]').trigger('submit')
    const saved = wrapper.emitted('save')?.[0]?.[0] as {
      name: string
      personality: string
    }
    expect(saved.name).toBe('韋小寶')
    expect(saved.personality).toBe('機靈狡黠')
  })

  it('缺 name 時顯示錯誤、不 emit save', async () => {
    const wrapper = mount(CharacterEditor)
    await wrapper.get('[data-testid="character-save"]').trigger('submit')
    expect(wrapper.find('[data-testid="character-error"]').exists()).toBe(true)
    expect(wrapper.emitted('save')).toBeUndefined()
  })

  it('save 後外部刷新 list 由父層處理：editor 不重置但 emit 帶 draft', async () => {
    const wrapper = mount(CharacterEditor)
    await wrapper.get('[data-testid="character-name"]').setValue('A')
    await wrapper.get('[data-testid="character-save"]').trigger('submit')
    await wrapper.get('[data-testid="character-name"]').setValue('B')
    await wrapper.get('[data-testid="character-save"]').trigger('submit')
    const events = wrapper.emitted('save') as unknown as Array<[{ name: string }]>
    expect(events).toHaveLength(2)
    expect(events[0]![0].name).toBe('A')
    expect(events[1]![0].name).toBe('B')
  })
})
