import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mkdir, readdir, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { auditorDryRun } from '@/services/consistency/auditor'
import { createNovel } from '@/services/files/novelRepository'
import { writeCharacter } from '@/services/files/characterRepository'
import { writeChapter } from '@/services/files/chapterRepository'
import { novelDir } from '@/services/files/paths'
import type { AssembledContext } from '@/types/ai'

const ROOT = path.join(tmpdir(), 'spectra-auditor-no-mutation')

async function fsSnapshot(dir: string): Promise<Map<string, number>> {
  const result = new Map<string, number>()
  async function walk(p: string): Promise<void> {
    const entries = await readdir(p, { withFileTypes: true })
    for (const e of entries) {
      const sub = path.join(p, e.name)
      if (e.isDirectory()) await walk(sub)
      else {
        const s = await stat(sub)
        result.set(sub, s.size)
      }
    }
  }
  await walk(dir)
  return result
}

const ctx: AssembledContext = {
  worldview: [{ id: 'w1', title: 'a', content: 'a', score: 0 }],
  characters: [
    {
      characterId: 'c1',
      name: '韋小寶',
      personality: '機靈',
      abilities: [],
      factionId: null,
      equipment: [],
      score: 0,
    },
  ],
  overallPlot: { summary: '', chapters: [] },
  presentCharacters: [],
  chapterOutline: { chapterId: 'ch1', outline: '誤入禁地' },
  chapterScene: {
    chapterId: 'ch1',
    scene: { location: '', time: '', weather: '', props: [], mood: '' },
  },
}

describe('integration: auditor 不會 mutate 任何 novel 檔', () => {
  let dir: string

  beforeEach(async () => {
    await rm(ROOT, { recursive: true, force: true })
    await mkdir(ROOT, { recursive: true })
    await createNovel(ROOT, { name: '鹿鼎記' })
    dir = novelDir(ROOT, '鹿鼎記')
    await writeCharacter(dir, { name: '韋小寶', personality: '沉默寡言' })
    await writeChapter(dir, { index: 1, title: '揚州街頭', outline: '初入江湖' })
  })

  afterEach(async () => {
    await rm(ROOT, { recursive: true, force: true })
  })

  it('呼叫 dryRun 前後 fs snapshot deep-equal', async () => {
    const before = await fsSnapshot(dir)
    auditorDryRun({
      candidateResponse: '韋小寶大喊一聲',
      chapterId: 'ch1',
      chapterIndex: 1,
      presentCharacters: [
        {
          id: 'c1',
          name: '韋小寶',
          personality: '沉默寡言',
          abilities: [],
          appearance: '',
          factionIds: [],
          socialStatus: '',
          relationships: [],
          notes: '',
          equipment: [],
          createdAt: '',
          updatedAt: '',
        },
      ],
      worldview: [{ id: 'w1', title: '清初', content: '清初江湖' }],
      deceasedCharacterIds: [],
      context: ctx,
      mutes: [],
    })
    const after = await fsSnapshot(dir)
    expect(after).toEqual(before)
  })
})
