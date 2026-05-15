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

  it('有陣營可選但全未勾選時 → 顯示「無陣營」提示文字', async () => {
    const wrapper = mount(CharacterEditor, {
      props: {
        factions: [
          {
            id: 'f1',
            name: '天地會',
            alignment: 'protagonist',
            description: '',
            currentSituation: '',
            keyMembers: [],
            createdAt: '',
            updatedAt: '',
          },
        ],
      },
    })
    const hint = wrapper.find('[data-testid="character-faction-empty-hint"]')
    expect(hint.exists()).toBe(true)
    expect(hint.text()).toContain('無陣營')
  })

  it('勾選任一陣營後 → 提示文字消失；emit save 帶 factionIds', async () => {
    const wrapper = mount(CharacterEditor, {
      props: {
        factions: [
          {
            id: 'f1',
            name: '天地會',
            alignment: 'protagonist',
            description: '',
            currentSituation: '',
            keyMembers: [],
            createdAt: '',
            updatedAt: '',
          },
        ],
      },
    })
    await wrapper.get('[data-testid="character-name"]').setValue('韋小寶')
    await wrapper.get('[data-testid="character-faction-checkbox-f1"]').setValue(true)
    expect(wrapper.find('[data-testid="character-faction-empty-hint"]').exists()).toBe(false)
    await wrapper.get('[data-testid="character-save"]').trigger('submit')
    const saved = wrapper.emitted('save')?.[0]?.[0] as { factionIds: string[] }
    expect(saved.factionIds).toEqual(['f1'])
  })

  it('全部陣營取消勾選後儲存 → emit save 帶空 factionIds（視為無陣營）', async () => {
    const wrapper = mount(CharacterEditor, {
      props: {
        character: {
          id: 'c1',
          name: '韋小寶',
          personality: '',
          abilities: [],
          appearance: '',
          factionIds: ['f1'],
          socialStatus: '',
          relationships: [],
          notes: '',
          equipment: [],
          createdAt: '',
          updatedAt: '',
        },
        factions: [
          {
            id: 'f1',
            name: '天地會',
            alignment: 'protagonist',
            description: '',
            currentSituation: '',
            keyMembers: [],
            createdAt: '',
            updatedAt: '',
          },
        ],
      },
    })
    await wrapper.get('[data-testid="character-faction-checkbox-f1"]').setValue(false)
    expect(wrapper.find('[data-testid="character-faction-empty-hint"]').exists()).toBe(true)
    await wrapper.get('[data-testid="character-save"]').trigger('submit')
    const saved = wrapper.emitted('save')?.[0]?.[0] as { factionIds: string[] }
    expect(saved.factionIds).toEqual([])
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
