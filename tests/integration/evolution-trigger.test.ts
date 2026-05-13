import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mkdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { detectPersonalityDrift } from '@/services/evolution/personalityDetector'
import { writeCharacter, readCharacter } from '@/services/files/characterRepository'
import { applyDriftSuggestion } from '@/services/evolution/applyDriftSuggestion'
import { createNovel } from '@/services/files/novelRepository'
import { novelDir } from '@/services/files/paths'

const ROOT = path.join(tmpdir(), 'spectra-evolution-trigger-tests')

describe('integration: evolution-trigger — AI 接受後觸發 detector 一次', () => {
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

  it('偵測到 drift → 使用者接受 → character.personality 更新', async () => {
    const created = await writeCharacter(dir, { name: '韋小寶', personality: '市井狡黠' })
    const finding = detectPersonalityDrift({
      character: created,
      candidateResponse: '韋小寶為了茅十八捨命相護',
      chapterId: 'ch3',
    })
    expect(finding).not.toBeNull()

    await applyDriftSuggestion({
      novelDir: dir,
      finding: finding!,
      action: 'accept-as-suggested',
    })
    const updated = await readCharacter(dir, created.id)
    expect(updated.personality).not.toBe('市井狡黠')
  })
})
