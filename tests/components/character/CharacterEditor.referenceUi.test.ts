import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import CharacterEditor from '@/components/character/CharacterEditor.vue'
import type { Character } from '@/types/character'
import type { EquipmentItem, EquipmentReference } from '@/types/equipment'

function ch(overrides: Partial<Character> = {}): Character {
  return {
    id: 'c-wei',
    name: '韋小寶',
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
    ...overrides,
  }
}

const lib: EquipmentItem[] = [
  { id: 'eq-yu', name: '玉佩', kind: 'wearable', defaultEffect: '飾品' },
  { id: 'eq-knife', name: '匕首', kind: 'misc', defaultEffect: '可割繩' },
]

describe('CharacterEditor.reference UI', () => {
  it('從裝備庫挑一件 → emit save 含 EquipmentReference 形狀（無 realEffect/extraEffect 欄位）', async () => {
    const wrapper = mount(CharacterEditor, {
      props: { character: ch(), equipmentLibrary: lib },
    })
    await wrapper.get('[data-testid="equipment-ref-add-select"]').setValue('eq-yu')
    await wrapper.get('[data-testid="equipment-ref-add-button"]').trigger('click')
    await wrapper.get('[data-testid="character-save"]').trigger('submit')
    const saved = wrapper.emitted('save')?.[0]?.[0] as { equipment: EquipmentReference[] }
    expect(saved.equipment).toHaveLength(1)
    expect(saved.equipment[0]?.equipmentId).toBe('eq-yu')
    expect(saved.equipment[0]?.realEffect).toBeUndefined()
    expect(saved.equipment[0]?.extraEffect).toBeUndefined()
  })

  it('填 realEffect 非空 → payload 含 realEffect', async () => {
    const wrapper = mount(CharacterEditor, {
      props: {
        character: ch({ equipment: [{ equipmentId: 'eq-yu' }] }),
        equipmentLibrary: lib,
      },
    })
    await wrapper.get('[data-testid="equipment-ref-real-effect-0"]').setValue('康熙親賜信物')
    await wrapper.get('[data-testid="character-save"]').trigger('submit')
    const saved = wrapper.emitted('save')?.[0]?.[0] as { equipment: EquipmentReference[] }
    expect(saved.equipment[0]?.realEffect).toBe('康熙親賜信物')
  })

  it('勾「明確無真正效果」toggle → payload 含 realEffect=""', async () => {
    const wrapper = mount(CharacterEditor, {
      props: {
        character: ch({ equipment: [{ equipmentId: 'eq-yu' }] }),
        equipmentLibrary: lib,
      },
    })
    await wrapper.get('[data-testid="equipment-ref-real-empty-0"]').setValue(true)
    await wrapper.get('[data-testid="character-save"]').trigger('submit')
    const saved = wrapper.emitted('save')?.[0]?.[0] as { equipment: EquipmentReference[] }
    expect(saved.equipment[0]?.realEffect).toBe('')
  })

  it('填 extraEffect 非空 → payload 含 extraEffect', async () => {
    const wrapper = mount(CharacterEditor, {
      props: {
        character: ch({ equipment: [{ equipmentId: 'eq-yu' }] }),
        equipmentLibrary: lib,
      },
    })
    await wrapper.get('[data-testid="equipment-ref-extra-effect-0"]').setValue('進宮免搜身')
    await wrapper.get('[data-testid="character-save"]').trigger('submit')
    const saved = wrapper.emitted('save')?.[0]?.[0] as { equipment: EquipmentReference[] }
    expect(saved.equipment[0]?.extraEffect).toBe('進宮免搜身')
  })

  it('勾「明確無額外效果」toggle → payload 含 extraEffect=""', async () => {
    const wrapper = mount(CharacterEditor, {
      props: {
        character: ch({ equipment: [{ equipmentId: 'eq-yu' }] }),
        equipmentLibrary: lib,
      },
    })
    await wrapper.get('[data-testid="equipment-ref-extra-empty-0"]').setValue(true)
    await wrapper.get('[data-testid="character-save"]').trigger('submit')
    const saved = wrapper.emitted('save')?.[0]?.[0] as { equipment: EquipmentReference[] }
    expect(saved.equipment[0]?.extraEffect).toBe('')
  })

  it('移除既有 reference → payload 不含該 reference', async () => {
    const wrapper = mount(CharacterEditor, {
      props: {
        character: ch({
          equipment: [{ equipmentId: 'eq-yu' }, { equipmentId: 'eq-knife' }],
        }),
        equipmentLibrary: lib,
      },
    })
    await wrapper.get('[data-testid="equipment-ref-remove-0"]').trigger('click')
    await wrapper.get('[data-testid="character-save"]').trigger('submit')
    const saved = wrapper.emitted('save')?.[0]?.[0] as { equipment: EquipmentReference[] }
    expect(saved.equipment).toHaveLength(1)
    expect(saved.equipment[0]?.equipmentId).toBe('eq-knife')
  })

  it('dangling reference 顯示「（已刪除：<id>）」灰字', async () => {
    const wrapper = mount(CharacterEditor, {
      props: {
        character: ch({ equipment: [{ equipmentId: 'eq-removed' }] }),
        equipmentLibrary: lib,
      },
    })
    expect(wrapper.text()).toContain('已刪除：eq-removed')
  })

  it('移除 dangling reference → payload 不含該 reference', async () => {
    const wrapper = mount(CharacterEditor, {
      props: {
        character: ch({ equipment: [{ equipmentId: 'eq-removed' }] }),
        equipmentLibrary: lib,
      },
    })
    await wrapper.get('[data-testid="equipment-ref-remove-0"]').trigger('click')
    await wrapper.get('[data-testid="character-save"]').trigger('submit')
    const saved = wrapper.emitted('save')?.[0]?.[0] as { equipment: EquipmentReference[] }
    expect(saved.equipment).toEqual([])
  })
})
