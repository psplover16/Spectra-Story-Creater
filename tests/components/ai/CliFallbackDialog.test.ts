import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import CliFallbackDialog from '@/components/ai/CliFallbackDialog.vue'

describe('CliFallbackDialog', () => {
  const baseProps = {
    failedSource: 'codex' as const,
    errorMessage: 'ENOENT: codex not in PATH',
  }

  it('retry 按鈕 emit retry', async () => {
    const wrapper = mount(CliFallbackDialog, { props: baseProps })
    await wrapper.get('[data-testid="cli-fallback-retry"]').trigger('click')
    expect(wrapper.emitted('retry')).toHaveLength(1)
  })

  it('改用 claude 按鈕 emit switch 含 target=claude', async () => {
    const wrapper = mount(CliFallbackDialog, { props: baseProps })
    await wrapper.get('[data-testid="cli-fallback-switch"]').trigger('click')
    expect(wrapper.emitted('switch')?.[0]).toEqual(['claude'])
  })

  it('取消 emit cancel', async () => {
    const wrapper = mount(CliFallbackDialog, { props: baseProps })
    await wrapper.get('[data-testid="cli-fallback-cancel"]').trigger('click')
    expect(wrapper.emitted('cancel')).toHaveLength(1)
  })
})
