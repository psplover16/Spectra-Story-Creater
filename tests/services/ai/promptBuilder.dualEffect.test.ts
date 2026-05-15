import { describe, expect, it } from 'vitest'

import { buildPrompt } from '@/services/ai/promptBuilder'
import type { AssembledContext, CharacterSlice } from '@/types/ai'

const baseScene = { location: '揚州', time: '', weather: '', props: [], mood: '' }

function ctxWithSlice(equipment: CharacterSlice['equipment']): AssembledContext {
  const slice: CharacterSlice = {
    characterId: 'c-wei',
    name: '韋小寶',
    personality: '機靈',
    abilities: [],
    factionId: null,
    equipment,
    score: 5,
  }
  return {
    worldview: [],
    characters: [slice],
    overallPlot: { summary: '', chapters: [] },
    presentCharacters: [slice],
    chapterOutline: { chapterId: 'ch1', outline: '' },
    chapterScene: { chapterId: 'ch1', scene: baseScene },
  }
}

describe('promptBuilder dual-effect rendering', () => {
  it('real+extra 都非空 → prompt 含 name/kind/real effect 與「額外效果：...」行', () => {
    const prompt = buildPrompt({
      context: ctxWithSlice([
        {
          id: 'eq-yu',
          name: '玉佩',
          kind: 'wearable',
          effect: '康熙親賜信物',
          hasEffect: true,
          extraEffect: '進宮免搜身',
          hasExtra: true,
        },
      ]),
      role: 'plot-driver',
      userPrompt: '',
    })
    expect(prompt).toContain('玉佩')
    expect(prompt).toContain('wearable')
    expect(prompt).toContain('康熙親賜信物')
    expect(prompt).toContain('額外效果：進宮免搜身')
  })

  it('real=空、extra=undefined → 含「（明確標示無真正效果）」、不含「額外效果：」', () => {
    const prompt = buildPrompt({
      context: ctxWithSlice([
        {
          id: 'eq-x',
          name: '詛咒符',
          kind: 'consumable',
          effect: '',
          hasEffect: false,
          extraEffect: '',
          hasExtra: false,
        },
      ]),
      role: 'plot-driver',
      userPrompt: '',
    })
    expect(prompt).toContain('（明確標示無真正效果）')
    expect(prompt).not.toContain('額外效果：')
  })

  it('real=defaultEffect、extra="" → 含 defaultEffect 與「額外效果：（明確標示無額外效果）」', () => {
    const prompt = buildPrompt({
      context: ctxWithSlice([
        {
          id: 'eq-yu',
          name: '玉佩',
          kind: 'wearable',
          effect: '飾品',
          hasEffect: true,
          extraEffect: '',
          hasExtra: true,
        },
      ]),
      role: 'plot-driver',
      userPrompt: '',
    })
    expect(prompt).toContain('飾品')
    expect(prompt).toContain('額外效果：（明確標示無額外效果）')
  })

  it('角色 equipment=[] → 不渲染「持有裝備：」', () => {
    const prompt = buildPrompt({
      context: ctxWithSlice([]),
      role: 'plot-driver',
      userPrompt: '',
    })
    expect(prompt).not.toContain('持有裝備：')
  })
})
