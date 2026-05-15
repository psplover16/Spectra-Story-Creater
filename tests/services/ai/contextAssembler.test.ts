import { describe, expect, it } from 'vitest'

import { createContextAssembler } from '@/services/ai/contextAssembler'
import type { Character } from '@/types/character'
import type { Chapter, Scene } from '@/types/chapter'
import type { Novel } from '@/types/novel'

const emptyScene: Scene = { location: '', time: '', weather: '', props: [], mood: '' }

function makeNovel(): Novel {
  return {
    id: 'n1',
    name: '鹿鼎記',
    style: '',
    worldview: [
      { id: 'w1', title: '清初江湖', content: '...' },
      { id: 'w2', title: '宮廷暗鬥', content: '...' },
    ],
    factionsSummary: [],
    overallOutline: { summary: '主角加入天地會', chapters: [] },
    createdAt: '',
    updatedAt: '',
  }
}

function makeChar(id: string, name: string, factionId: string | null): Character {
  return {
    id,
    name,
    personality: '',
    abilities: [],
    appearance: '',
    factionIds: factionId === null ? [] : [factionId],
    socialStatus: '',
    relationships: [],
    notes: '',
    equipment: [],
    createdAt: '',
    updatedAt: '',
  }
}

function makeChapter(id: string, outline: string, present: string[]): Chapter {
  return {
    id,
    index: 1,
    title: '一章',
    outline,
    scene: emptyScene,
    content: '',
    presentCharacters: present,
    createdAt: '',
    updatedAt: '',
  }
}

describe('contextAssembler 六層', () => {
  it('六層皆存在；空場景時 presentCharacters=[]、chapterScene 為空場景', async () => {
    const assembler = createContextAssembler({
      loadNovel: async () => makeNovel(),
      loadCharacters: async () => [makeChar('c1', '韋小寶', null)],
      loadChapters: async () => [makeChapter('ch1', '空白章節', [])],
    })
    const context = await assembler.assemble({ novelId: 'n1', chapterId: 'ch1', tokenBudget: 1000 })
    expect(context.worldview.length).toBeGreaterThan(0)
    expect(context.characters.length).toBeGreaterThan(0)
    expect(context.overallPlot.summary).toBe('主角加入天地會')
    expect(context.presentCharacters).toEqual([])
    expect(context.chapterScene.scene).toEqual(emptyScene)
  })
})
