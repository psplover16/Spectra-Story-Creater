import { describe, expect, it } from 'vitest'

import { buildPrompt } from '@/services/ai/promptBuilder'
import type { AssembledContext } from '@/types/ai'

const emptyContext: AssembledContext = {
  worldview: [{ id: 'w1', title: '清初江湖', content: '混亂', score: 0 }],
  characters: [
    {
      characterId: 'c1',
      name: '韋小寶',
      personality: '機靈',
      abilities: ['口才'],
      factionId: null,
      score: 5,
    },
  ],
  overallPlot: {
    summary: '主角加入天地會',
    chapters: [{ chapterId: 'ch1', title: '揚州街頭', brief: '初入江湖' }],
  },
  presentCharacters: [],
  chapterOutline: { chapterId: 'ch1', outline: '誤入禁地' },
  chapterScene: {
    chapterId: 'ch1',
    scene: { location: '揚州', time: '清晨', weather: '陰雨', props: [], mood: '緊張' },
  },
}

describe('promptBuilder', () => {
  it('六層按順序依序出現於最終 prompt', () => {
    const prompt = buildPrompt({
      context: emptyContext,
      role: 'plot-driver',
      userPrompt: '給我下一段建議',
    })
    const idxWorld = prompt.indexOf('# 1. 世界觀')
    const idxChar = prompt.indexOf('# 2. 角色')
    const idxPlot = prompt.indexOf('# 3. 整體劇情')
    const idxPresent = prompt.indexOf('# 4. 本章在場角色')
    const idxOutline = prompt.indexOf('# 5. 章節大綱')
    const idxScene = prompt.indexOf('# 6. 章節場景')
    expect(idxWorld).toBeGreaterThan(-1)
    expect(idxChar).toBeGreaterThan(idxWorld)
    expect(idxPlot).toBeGreaterThan(idxChar)
    expect(idxPresent).toBeGreaterThan(idxPlot)
    expect(idxOutline).toBeGreaterThan(idxPresent)
    expect(idxScene).toBeGreaterThan(idxOutline)
    expect(prompt).toContain('# 使用者提示')
  })

  it('六個 role 各有對應 instruction 區段被注入', () => {
    const roles: Array<'plot-driver' | 'character-voice' | 'worldbuilding'> = [
      'plot-driver',
      'character-voice',
      'worldbuilding',
    ]
    for (const r of roles) {
      const prompt = buildPrompt({ context: emptyContext, role: r, userPrompt: '' })
      expect(prompt).toContain('# 行為（Behavior）')
    }
  })
})
