import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import WorldviewEditor from '@/components/worldview/WorldviewEditor.vue'
import type { WorldviewEntry } from '@/types/novel'

describe('WorldviewEditor', () => {
  it('新增 entry 後 emit add 含 title/content', async () => {
    const wrapper = mount(WorldviewEditor, { props: { entries: [] } })
    await wrapper.get('[data-testid="worldview-new-title"]').setValue('清初江湖')
    await wrapper.get('[data-testid="worldview-new-content"]').setValue('鏢局橫行，幫派並起')
    await wrapper.get('[data-testid="worldview-add"]').trigger('click')
    const added = wrapper.emitted('add')?.[0]?.[0] as WorldviewEntry
    expect(added.title).toBe('清初江湖')
    expect(added.content).toBe('鏢局橫行，幫派並起')
  })

  it('既有 entry 標題改寫後 emit update', async () => {
    const entry: WorldviewEntry = { id: 'wv1', title: '初版', content: '...' }
    const wrapper = mount(WorldviewEditor, { props: { entries: [entry] } })
    await wrapper.get('[data-testid="worldview-title-wv1"]').setValue('修訂版')
    const updated = wrapper.emitted('update')?.[0]?.[0] as WorldviewEntry
    expect(updated.title).toBe('修訂版')
    expect(updated.id).toBe('wv1')
  })

  it('移除 entry 後 emit remove 含 id', async () => {
    const entry: WorldviewEntry = { id: 'wv1', title: '初版', content: '' }
    const wrapper = mount(WorldviewEditor, { props: { entries: [entry] } })
    await wrapper.get('[data-testid="worldview-remove-wv1"]').trigger('click')
    expect(wrapper.emitted('remove')?.[0]).toEqual(['wv1'])
  })
})
