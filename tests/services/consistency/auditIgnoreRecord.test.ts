import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mkdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { appendIgnoreRecord, readIgnoreRecords } from '@/services/consistency/auditIgnoreRecord'

const ROOT = path.join(tmpdir(), 'spectra-audit-ignore-tests')

describe('auditIgnoreRecord', () => {
  beforeEach(async () => {
    await rm(ROOT, { recursive: true, force: true })
    await mkdir(ROOT, { recursive: true })
  })

  afterEach(async () => {
    await rm(ROOT, { recursive: true, force: true })
  })

  it('append 後可讀回多筆紀錄', async () => {
    await appendIgnoreRecord(ROOT, {
      finding: {
        category: 'ooc',
        chapterId: 'ch1',
        evidence: '...',
        severity: 'low',
      },
      chapterId: 'ch1',
      ignoredAt: '2026-05-13T00:00:00.000Z',
    })
    await appendIgnoreRecord(ROOT, {
      finding: {
        category: 'timeline-conflict',
        chapterId: 'ch2',
        evidence: '...',
        severity: 'high',
      },
      chapterId: 'ch2',
      ignoredAt: '2026-05-13T00:00:01.000Z',
    })
    const records = await readIgnoreRecords(ROOT)
    expect(records).toHaveLength(2)
    expect(records[0]?.finding.category).toBe('ooc')
    expect(records[1]?.finding.category).toBe('timeline-conflict')
  })
})
