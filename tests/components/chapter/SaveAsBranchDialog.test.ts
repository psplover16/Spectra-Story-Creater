import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import SaveAsBranchDialog from '@/components/chapter/SaveAsBranchDialog.vue'

describe('SaveAsBranchDialog', () => {
  it('輸入分支名稱按確認後 emit confirm 含名稱', async () => {
    const wrapper = mount(SaveAsBranchDialog, { props: { chapterTitle: '誤入禁地' } })
    await wrapper.get('[data-testid="branch-name"]').setValue('alt-pov-茅十八')
    await wrapper.get('[data-testid="branch-confirm"]').trigger('click')
    expect(wrapper.emitted('confirm')?.[0]).toEqual(['alt-pov-茅十八'])
  })

  it('空名稱拒絕並顯示錯誤', async () => {
    const wrapper = mount(SaveAsBranchDialog, { props: { chapterTitle: '誤入禁地' } })
    await wrapper.get('[data-testid="branch-confirm"]').trigger('click')
    expect(wrapper.find('[data-testid="branch-error"]').exists()).toBe(true)
    expect(wrapper.emitted('confirm')).toBeUndefined()
  })

  it('取消後 emit cancel', async () => {
    const wrapper = mount(SaveAsBranchDialog, { props: { chapterTitle: '誤入禁地' } })
    await wrapper.get('[data-testid="branch-cancel"]').trigger('click')
    expect(wrapper.emitted('cancel')).toHaveLength(1)
  })
})
