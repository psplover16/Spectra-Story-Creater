import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import SwitchNovelConfirmDialog from '@/components/workspace/SwitchNovelConfirmDialog.vue'

describe('SwitchNovelConfirmDialog', () => {
  const baseProps = { fromNovel: '鹿鼎記', toNovel: '射雕英雄傳' }

  it('按儲存後切換 emit save', async () => {
    const wrapper = mount(SwitchNovelConfirmDialog, { props: baseProps })
    await wrapper.get('[data-testid="switch-save"]').trigger('click')
    expect(wrapper.emitted('save')).toHaveLength(1)
  })

  it('按放棄變更並切換 emit discard', async () => {
    const wrapper = mount(SwitchNovelConfirmDialog, { props: baseProps })
    await wrapper.get('[data-testid="switch-discard"]').trigger('click')
    expect(wrapper.emitted('discard')).toHaveLength(1)
  })

  it('按取消 emit cancel', async () => {
    const wrapper = mount(SwitchNovelConfirmDialog, { props: baseProps })
    await wrapper.get('[data-testid="switch-cancel"]').trigger('click')
    expect(wrapper.emitted('cancel')).toHaveLength(1)
  })
})
