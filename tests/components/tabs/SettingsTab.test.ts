import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import SettingsTab from '@/components/tabs/SettingsTab.vue'

function stubApi(): void {
  ;(window as unknown as { api: unknown }).api = {
    ai: { invoke: vi.fn() },
    novel: { read: vi.fn(), write: vi.fn() },
  }
}

async function flush(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0))
}

describe('SettingsTab', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    stubApi()
  })

  it('mount 預設狀態下成功（不丟例外）並渲染 SettingsView 與儲存按鈕', async () => {
    const wrapper = mount(SettingsTab, { props: { novelId: 'n1', novelDir: 'D:/Novels/n1' } })
    await flush()
    expect(wrapper.find('[data-testid="settings-view"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="cli-path-save"]').exists()).toBe(true)
  })

  it('儲存 CLI 路徑後 → 觸發內部 saved state 顯示「已儲存」', async () => {
    const wrapper = mount(SettingsTab, { props: { novelId: 'n1', novelDir: 'D:/Novels/n1' } })
    await flush()
    await wrapper.get('[data-testid="cli-path-codex"]').setValue('/usr/local/bin/codex')
    await wrapper.get('[data-testid="cli-path-claude"]').setValue('/usr/local/bin/claude')
    await wrapper.get('[data-testid="cli-path-save"]').trigger('click')
    await flush()
    expect(wrapper.find('[data-testid="settings-saved"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="settings-saved"]').text()).toContain('已儲存')
  })

  it('儲存後 saved state 反映 codex 與 claude 路徑值', async () => {
    const wrapper = mount(SettingsTab, { props: { novelId: 'n1', novelDir: 'D:/Novels/n1' } })
    await flush()
    await wrapper.get('[data-testid="cli-path-codex"]').setValue('codex-bin')
    await wrapper.get('[data-testid="cli-path-claude"]').setValue('claude-bin')
    await wrapper.get('[data-testid="cli-path-save"]').trigger('click')
    await flush()
    const dump = wrapper.get('[data-testid="settings-saved"]').text()
    expect(dump).toContain('codex-bin')
    expect(dump).toContain('claude-bin')
  })
})
