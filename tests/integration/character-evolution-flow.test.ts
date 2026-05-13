import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mkdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { detectPersonalityDrift } from '@/services/evolution/personalityDetector'
import { applyDriftSuggestion } from '@/services/evolution/applyDriftSuggestion'
import { readDriftLog } from '@/services/evolution/driftLog'
import { readCharacter, writeCharacter } from '@/services/files/characterRepository'
import { createNovel } from '@/services/files/novelRepository'
import { novelDir } from '@/services/files/paths'

const ROOT = path.join(tmpdir(), 'spectra-character-evolution-flow-tests')

describe('integration: character-evolution-flow（AI 偵測 → 接受 → 角色更新 + log）', () => {
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

  it('完整流程：detector 偵測 → accept-as-suggested → 角色 personality 改寫 + drift-log.jsonl 新增一行', async () => {
    const created = await writeCharacter(dir, { name: '韋小寶', personality: '市井狡黠' })
    const finding = detectPersonalityDrift({
      character: created,
      candidateResponse: '韋小寶為兄弟捨命相護',
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

    const log = await readDriftLog(dir, created.id)
    expect(log).toHaveLength(1)
    expect(log[0]?.decision).toBe('accept-as-suggested')
  })
})
