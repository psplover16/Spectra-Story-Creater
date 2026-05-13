import { describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

import WorkspaceSelectView from '@/views/WorkspaceSelectView.vue'

describe('WorkspaceSelectView', () => {
  it('首次啟動：使用者按按鈕、挑選有寫入權限的資料夾後 emit selected', async () => {
    const pickFolder = vi.fn().mockResolvedValue('D:/Novels')
    const isWritable = vi.fn().mockResolvedValue(true)
    const wrapper = mount(WorkspaceSelectView, {
      props: { pickFolder, isWritable },
    })
    await wrapper.get('[data-testid="pick-folder"]').trigger('click')
    await flushPromises()
    expect(wrapper.emitted('selected')?.[0]).toEqual(['D:/Novels'])
  })

  it('唯讀資料夾被拒絕後顯示錯誤、且不 emit selected', async () => {
    const pickFolder = vi.fn().mockResolvedValue('D:/ReadOnly')
    const isWritable = vi.fn().mockResolvedValue(false)
    const wrapper = mount(WorkspaceSelectView, {
      props: { pickFolder, isWritable },
    })
    await wrapper.get('[data-testid="pick-folder"]').trigger('click')
    await flushPromises()
    expect(wrapper.emitted('selected')).toBeUndefined()
    expect(wrapper.get('[data-testid="error"]').text()).toContain('唯讀')
  })
})
