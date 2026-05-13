import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import ExportDialog from '@/components/chapter/ExportDialog.vue'

describe('ExportDialog unsaved 提示', () => {
  it('未儲存 → 點匯出 emit saveBeforeExport（不直接觸發 confirm）', async () => {
    const wrapper = mount(ExportDialog, {
      props: { branches: [], hasUnsavedChanges: true },
    })
    expect(wrapper.find('[data-testid="export-unsaved"]').exists()).toBe(true)
    await wrapper.get('[data-testid="export-confirm"]').trigger('click')
    expect(wrapper.emitted('saveBeforeExport')).toHaveLength(1)
    expect(wrapper.emitted('confirm')).toBeUndefined()
  })

  it('cancel 路徑 emit cancel 不寫檔', async () => {
    const wrapper = mount(ExportDialog, {
      props: { branches: [], hasUnsavedChanges: true },
    })
    await wrapper.get('[data-testid="export-cancel"]').trigger('click')
    expect(wrapper.emitted('cancel')).toHaveLength(1)
  })
})
