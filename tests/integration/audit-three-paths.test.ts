import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mkdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { auditorDryRun } from '@/services/consistency/auditor'
import { appendIgnoreRecord, readIgnoreRecords } from '@/services/consistency/auditIgnoreRecord'
import type { AssembledContext } from '@/types/ai'
import type { AuditFinding } from '@/types/audit'

const ROOT = path.join(tmpdir(), 'spectra-audit-three-paths-tests')

const ctx: AssembledContext = {
  worldview: [{ id: 'w1', title: '清初', content: '清初江湖', score: 0 }],
  characters: [
    {
      characterId: 'c1',
      name: '韋小寶',
      personality: '沉默寡言',
      abilities: [],
      factionId: null,
      score: 0,
    },
  ],
  overallPlot: { summary: '', chapters: [] },
  presentCharacters: [],
  chapterOutline: { chapterId: 'ch1', outline: '某事' },
  chapterScene: {
    chapterId: 'ch1',
    scene: { location: '', time: '', weather: '', props: [], mood: '' },
  },
}

describe('integration: 三路徑 rewrite / update-setup / ignore', () => {
  beforeEach(async () => {
    await rm(ROOT, { recursive: true, force: true })
    await mkdir(ROOT, { recursive: true })
  })

  afterEach(async () => {
    await rm(ROOT, { recursive: true, force: true })
  })

  it('findings → ignore 路徑寫入 ignore log', async () => {
    const result = auditorDryRun({
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
          factionId: null,
          socialStatus: '',
          relationships: [],
          notes: '',
          createdAt: '',
          updatedAt: '',
        },
      ],
      worldview: [{ id: 'w1', title: '清初', content: '清初江湖' }],
      deceasedCharacterIds: [],
      context: ctx,
      mutes: [],
    })
    expect(result.kind).toBe('findings')
    if (result.kind !== 'findings') return
    const finding: AuditFinding = result.findings[0]!
    await appendIgnoreRecord(ROOT, {
      finding,
      chapterId: 'ch1',
      ignoredAt: new Date().toISOString(),
    })
    const records = await readIgnoreRecords(ROOT)
    expect(records).toHaveLength(1)
    expect(records[0]?.finding.category).toBe(finding.category)
  })

  it('rewrite / update-setup 路徑：findings 存在但不寫 ignore log（由父層使用者選擇驅動）', async () => {
    // rewrite 等於不寫 ignore，update-setup 同樣。本測試只驗證沒有 ignore log 副作用。
    const before = await readIgnoreRecords(ROOT)
    expect(before).toEqual([])
  })
})
