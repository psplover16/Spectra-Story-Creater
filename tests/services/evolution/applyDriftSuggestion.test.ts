import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mkdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { applyDriftSuggestion } from '@/services/evolution/applyDriftSuggestion'
import { readDriftLog } from '@/services/evolution/driftLog'
import { writeCharacter } from '@/services/files/characterRepository'
import { createNovel } from '@/services/files/novelRepository'
import { novelDir } from '@/services/files/paths'
import type { DriftFinding } from '@/types/character'

const ROOT = path.join(tmpdir(), 'spectra-apply-drift-tests')

describe('applyDriftSuggestion 三路徑', () => {
  let dir: string
  let characterId: string
  const findingTemplate: Omit<DriftFinding, 'characterId'> = {
    detectedAt: '2026-05-13T00:00:00.000Z',
    chapterId: 'ch1',
    evidence: '...',
    suggestedRewrite: '改寫後性格',
    decision: null,
  }

  beforeEach(async () => {
    await rm(ROOT, { recursive: true, force: true })
    await mkdir(ROOT, { recursive: true })
    await createNovel(ROOT, { name: '鹿鼎記' })
    dir = novelDir(ROOT, '鹿鼎記')
    const c = await writeCharacter(dir, { name: '韋小寶', personality: '市井狡黠' })
    characterId = c.id
  })

  afterEach(async () => {
    await rm(ROOT, { recursive: true, force: true })
  })

  it('accept-as-suggested：character.personality 改成 suggestedRewrite，log 含 decision', async () => {
    const updated = await applyDriftSuggestion({
      novelDir: dir,
      finding: { characterId, ...findingTemplate },
      action: 'accept-as-suggested',
    })
    expect(updated.personality).toBe('改寫後性格')
    const log = await readDriftLog(dir, characterId)
    expect(log[0]?.decision).toBe('accept-as-suggested')
  })

  it('edit-then-accept：用 customPersonality 寫入', async () => {
    const updated = await applyDriftSuggestion({
      novelDir: dir,
      finding: { characterId, ...findingTemplate },
      action: 'edit-then-accept',
      customPersonality: '自訂版本',
    })
    expect(updated.personality).toBe('自訂版本')
  })

  it('dismiss：character.personality 不變，log 寫入 decision=dismiss', async () => {
    const result = await applyDriftSuggestion({
      novelDir: dir,
      finding: { characterId, ...findingTemplate },
      action: 'dismiss',
    })
    expect(result.personality).toBe('市井狡黠')
    const log = await readDriftLog(dir, characterId)
    expect(log[0]?.decision).toBe('dismiss')
  })
})
