import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mkdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { createContextAssembler } from '@/services/ai/contextAssembler'
import { writeChapter, listChapters } from '@/services/files/chapterRepository'
import { writeCharacter, listCharacters } from '@/services/files/characterRepository'
import { createNovel, readNovel, writeNovel } from '@/services/files/novelRepository'
import { novelDir } from '@/services/files/paths'

const ROOT = path.join(tmpdir(), 'spectra-context-assembler-realnovel-tests')

describe('integration: contextAssembler 對真實 fixture 小說', () => {
  let dir: string

  beforeEach(async () => {
    await rm(ROOT, { recursive: true, force: true })
    await mkdir(ROOT, { recursive: true })
    await createNovel(ROOT, { name: '鹿鼎記' })
    dir = novelDir(ROOT, '鹿鼎記')
    const novel = await readNovel(dir)
    await writeNovel(dir, {
      ...novel,
      worldview: [
        { id: 'w1', title: '清初江湖', content: '清初年間，江湖混亂' },
        { id: 'w2', title: '宮廷暗鬥', content: '皇帝幼齡' },
      ],
      overallOutline: {
        summary: '韋小寶從揚州街頭一路混入皇宮',
        chapters: [{ chapterId: 'ch1', title: '揚州街頭', brief: '初入江湖' }],
      },
    })
    await writeCharacter(dir, {
      name: '韋小寶',
      personality: '機靈狡黠',
      abilities: ['口才'],
    })
    await writeChapter(dir, {
      index: 1,
      title: '揚州街頭',
      outline: '誤入禁地',
    })
  })

  afterEach(async () => {
    await rm(ROOT, { recursive: true, force: true })
  })

  it('六層完整輸出，且 overallPlot summary 對得上', async () => {
    const assembler = createContextAssembler({
      loadNovel: () => readNovel(dir),
      loadCharacters: () => listCharacters(dir),
      loadChapters: () => listChapters(dir),
    })
    const chapters = await listChapters(dir)
    const ch = chapters[0]!
    const context = await assembler.assemble({
      novelId: 'n1',
      chapterId: ch.id,
      tokenBudget: 5000,
    })
    expect(context.worldview.length).toBeGreaterThanOrEqual(2)
    expect(context.characters.some((c) => c.name === '韋小寶')).toBe(true)
    expect(context.overallPlot.summary).toContain('韋小寶')
    expect(context.chapterOutline.outline).toBe('誤入禁地')
  })
})
