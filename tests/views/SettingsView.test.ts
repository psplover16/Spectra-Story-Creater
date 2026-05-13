import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

import SettingsView from '@/views/SettingsView.vue'

describe('SettingsView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('輸入 CLI 路徑後儲存 emit saveCliPaths', async () => {
    const wrapper = mount(SettingsView, { props: { novelId: 'n1' } })
    await wrapper.get('[data-testid="cli-path-codex"]').setValue('/usr/local/bin/codex')
    await wrapper.get('[data-testid="cli-path-claude"]').setValue('/usr/local/bin/claude')
    await wrapper.get('[data-testid="cli-path-save"]').trigger('click')
    const emitted = wrapper.emitted('saveCliPaths')?.[0]?.[0] as {
      codex: string
      claude: string
    }
    expect(emitted.codex).toBe('/usr/local/bin/codex')
    expect(emitted.claude).toBe('/usr/local/bin/claude')
  })
})
