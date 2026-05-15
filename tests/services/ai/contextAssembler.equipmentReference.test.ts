import { describe, expect, it, vi } from 'vitest'

import { createContextAssembler } from '@/services/ai/contextAssembler'
import type { Character } from '@/types/character'
import type { Chapter, Scene } from '@/types/chapter'
import type { Novel } from '@/types/novel'
import type { EquipmentItem, EquipmentReference } from '@/types/equipment'

const emptyScene: Scene = { location: '', time: '', weather: '', props: [], mood: '' }

function makeNovel(): Novel {
  return {
    id: 'n1',
    name: 'eq-ref',
    style: '',
    worldview: [],
    factionsSummary: [],
    overallOutline: { summary: '', chapters: [] },
    createdAt: '',
    updatedAt: '',
  }
}

function makeChar(id: string, equipment: EquipmentReference[]): Character {
  return {
    id,
    name: id,
    personality: '',
    abilities: [],
    appearance: '',
    factionIds: [],
    socialStatus: '',
    relationships: [],
    notes: '',
    equipment,
    createdAt: '',
    updatedAt: '',
  }
}

function makeChapter(id: string, present: string[]): Chapter {
  return {
    id,
    index: 1,
    title: '一章',
    outline: '',
    scene: emptyScene,
    content: '',
    presentCharacters: present,
    createdAt: '',
    updatedAt: '',
  }
}

const lib: EquipmentItem[] = [
  { id: 'eq-yu', name: '玉佩', kind: 'wearable', defaultEffect: '飾品' },
]

function setup(refs: EquipmentReference[]) {
  const char = makeChar('c-wei', refs)
  return createContextAssembler({
    loadNovel: async () => makeNovel(),
    loadCharacters: async () => [char],
    loadChapters: async () => [makeChapter('ch1', ['c-wei'])],
    loadEquipment: async () => lib,
  })
}

describe('contextAssembler.equipment reference resolve', () => {
  it('realEffect 非空 → effect=realEffect, hasEffect=true', async () => {
    const ctx = await setup([{ equipmentId: 'eq-yu', realEffect: '康熙親賜信物' }]).assemble({
      novelId: 'n1',
      chapterId: 'ch1',
      tokenBudget: 8000,
    })
    const wei = ctx.characters.find((c) => c.characterId === 'c-wei')!
    expect(wei.equipment[0]).toMatchObject({ effect: '康熙親賜信物', hasEffect: true })
  })

  it('realEffect=undefined → effect=defaultEffect, hasEffect=true', async () => {
    const ctx = await setup([{ equipmentId: 'eq-yu' }]).assemble({
      novelId: 'n1',
      chapterId: 'ch1',
      tokenBudget: 8000,
    })
    const wei = ctx.characters.find((c) => c.characterId === 'c-wei')!
    expect(wei.equipment[0]).toMatchObject({ effect: '飾品', hasEffect: true })
  })

  it('realEffect="" → effect="", hasEffect=false', async () => {
    const ctx = await setup([{ equipmentId: 'eq-yu', realEffect: '' }]).assemble({
      novelId: 'n1',
      chapterId: 'ch1',
      tokenBudget: 8000,
    })
    const wei = ctx.characters.find((c) => c.characterId === 'c-wei')!
    expect(wei.equipment[0]).toMatchObject({ effect: '', hasEffect: false })
  })

  it('extraEffect 非空 → extraEffect/hasExtra 對應', async () => {
    const ctx = await setup([{ equipmentId: 'eq-yu', extraEffect: '進宮免搜身' }]).assemble({
      novelId: 'n1',
      chapterId: 'ch1',
      tokenBudget: 8000,
    })
    const wei = ctx.characters.find((c) => c.characterId === 'c-wei')!
    expect(wei.equipment[0]).toMatchObject({ extraEffect: '進宮免搜身', hasExtra: true })
  })

  it('extraEffect=undefined → extraEffect="", hasExtra=false', async () => {
    const ctx = await setup([{ equipmentId: 'eq-yu' }]).assemble({
      novelId: 'n1',
      chapterId: 'ch1',
      tokenBudget: 8000,
    })
    const wei = ctx.characters.find((c) => c.characterId === 'c-wei')!
    expect(wei.equipment[0]).toMatchObject({ extraEffect: '', hasExtra: false })
  })

  it('extraEffect="" → extraEffect="", hasExtra=true', async () => {
    const ctx = await setup([{ equipmentId: 'eq-yu', extraEffect: '' }]).assemble({
      novelId: 'n1',
      chapterId: 'ch1',
      tokenBudget: 8000,
    })
    const wei = ctx.characters.find((c) => c.characterId === 'c-wei')!
    expect(wei.equipment[0]).toMatchObject({ extraEffect: '', hasExtra: true })
  })

  it('dangling reference → 跳過該 entry 並 console.warn', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const ctx = await setup([{ equipmentId: 'eq-removed' }]).assemble({
      novelId: 'n1',
      chapterId: 'ch1',
      tokenBudget: 8000,
    })
    const wei = ctx.characters.find((c) => c.characterId === 'c-wei')!
    expect(wei.equipment).toHaveLength(0)
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })
})
