import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import SceneEditor from '@/components/chapter/SceneEditor.vue'
import type { Scene } from '@/types/chapter'

const emptyScene: Scene = { location: '', time: '', weather: '', props: [], mood: '' }

describe('SceneEditor', () => {
  it('五欄位輸入後 emit update 含全部五值（props 用換行切分）', async () => {
    const wrapper = mount(SceneEditor, { props: { scene: emptyScene } })
    await wrapper.get('[data-testid="scene-location"]').setValue('揚州麗春院')
    await wrapper.get('[data-testid="scene-time"]').setValue('清晨')
    await wrapper.get('[data-testid="scene-weather"]').setValue('陰雨')
    await wrapper.get('[data-testid="scene-props"]').setValue('銀子\n短刀')
    await wrapper.get('[data-testid="scene-mood"]').setValue('緊張')
    await wrapper.get('[data-testid="scene-save"]').trigger('click')

    const updated = wrapper.emitted('update')?.[0]?.[0] as Scene
    expect(updated.location).toBe('揚州麗春院')
    expect(updated.time).toBe('清晨')
    expect(updated.weather).toBe('陰雨')
    expect(updated.props).toEqual(['銀子', '短刀'])
    expect(updated.mood).toBe('緊張')
  })
})
