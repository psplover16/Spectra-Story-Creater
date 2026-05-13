import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mkdir, readdir, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { detectPersonalityDrift } from '@/services/evolution/personalityDetector'
import { createNovel } from '@/services/files/novelRepository'
import { writeCharacter } from '@/services/files/characterRepository'
import { novelDir } from '@/services/files/paths'

const ROOT = path.join(tmpdir(), 'spectra-personality-no-auto-write-tests')

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

describe('integration: personalityDetector 與 DriftSuggestionPanel 不自動 mutate', () => {
  let dir: string

  beforeEach(async () => {
    await rm(ROOT, { recursive: true, force: true })
    await mkdir(ROOT, { recursive: true })
    await createNovel(ROOT, { name: '鹿鼎記' })
    dir = novelDir(ROOT, '鹿鼎記')
  })

  afterEach(async () => {
    await rm(ROOT, { recursive: true, force: true })
  })

  it('呼叫 detector 前後 fs snapshot deep-equal', async () => {
    const created = await writeCharacter(dir, { name: '韋小寶', personality: '市井狡黠' })
    const before = await fsSnapshot(dir)
    detectPersonalityDrift({
      character: created,
      candidateResponse: '韋小寶為兄弟捨命相護',
      chapterId: 'ch3',
    })
    const after = await fsSnapshot(dir)
    expect(after).toEqual(before)
  })
})
