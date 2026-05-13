import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mkdir, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { readNovelBindings, writeNovelBindings } from '@/services/ai/bindingRepository'

const ROOT = path.join(tmpdir(), 'spectra-binding-repo-tests')

describe('bindingRepository', () => {
  beforeEach(async () => {
    await rm(ROOT, { recursive: true, force: true })
    await mkdir(ROOT, { recursive: true })
  })

  afterEach(async () => {
    await rm(ROOT, { recursive: true, force: true })
  })

  it('寫入後可讀回，且檔案 UTF-8 無 BOM', async () => {
    await writeNovelBindings(ROOT, {
      roleBindings: { 'plot-driver': 'claude' },
      characterBindings: { 韋小寶: 'codex' },
      paragraphBindings: {},
    })
    const raw = await readFile(path.join(ROOT, 'ai-bindings.json'))
    expect(raw[0]).not.toBe(0xef) // 無 BOM
    const read = await readNovelBindings(ROOT)
    expect(read.roleBindings['plot-driver']).toBe('claude')
    expect(read.characterBindings['韋小寶']).toBe('codex')
  })

  it('檔案不存在時回 empty bindings', async () => {
    const read = await readNovelBindings(ROOT)
    expect(read.roleBindings).toEqual({})
    expect(read.characterBindings).toEqual({})
    expect(read.paragraphBindings).toEqual({})
  })
})
