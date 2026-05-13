import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import CharacterRelationshipEditor from '@/components/character/CharacterRelationshipEditor.vue'
import type { Character } from '@/types/character'

function ch(id: string, name: string): Character {
  return {
    id,
    name,
    personality: '',
    abilities: [],
    appearance: '',
    factionId: null,
    socialStatus: '',
    relationships: [],
    notes: '',
    createdAt: '',
    updatedAt: '',
  }
}

describe('CharacterRelationshipEditor', () => {
  const sourceCharacterId = 'src'
  const availableCharacters = [ch('a', '茅十八'), ch('b', '康熙')]

  it('happy add：選對象 + 填類型描述後 emit add 含 targetCharacterId', async () => {
    const wrapper = mount(CharacterRelationshipEditor, {
      props: { sourceCharacterId, existingRelationships: [], availableCharacters },
    })
    await wrapper.get('[data-testid="relationship-target"]').setValue('a')
    await wrapper.get('[data-testid="relationship-kind"]').setValue('義兄')
    await wrapper.get('[data-testid="relationship-description"]').setValue('初識於街頭')
    await wrapper.get('[data-testid="relationship-add"]').trigger('click')
    const added = wrapper.emitted('add')?.[0]?.[0] as {
      targetCharacterId: string
      kind: string
    }
    expect(added.targetCharacterId).toBe('a')
    expect(added.kind).toBe('義兄')
  })

  it('指定不存在角色拒絕 + 顯示錯誤', async () => {
    const wrapper = mount(CharacterRelationshipEditor, {
      props: {
        sourceCharacterId,
        existingRelationships: [],
        availableCharacters,
      },
      attachTo: document.body,
    })
    // 強制 select 一個不存在的 id（模擬資料不一致）
    const select = wrapper.get<HTMLSelectElement>('[data-testid="relationship-target"]')
      .element as HTMLSelectElement
    const opt = document.createElement('option')
    opt.value = 'ghost'
    opt.textContent = 'ghost'
    select.appendChild(opt)
    select.value = 'ghost'
    select.dispatchEvent(new Event('change'))
    await wrapper.get('[data-testid="relationship-add"]').trigger('click')
    expect(wrapper.find('[data-testid="relationship-error"]').exists()).toBe(true)
    expect(wrapper.emitted('add')).toBeUndefined()
  })
})
