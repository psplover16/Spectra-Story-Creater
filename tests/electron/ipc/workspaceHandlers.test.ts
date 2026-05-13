import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { __resetWorkspaceState, workspaceHandlers } from '../../../electron/ipc/workspaceHandlers'

const ROOT = path.join(tmpdir(), 'spectra-workspace-handlers-tests')

describe('workspaceHandlers', () => {
  beforeEach(async () => {
    await rm(ROOT, { recursive: true, force: true })
    await mkdir(ROOT, { recursive: true })
    __resetWorkspaceState()
  })

  afterEach(async () => {
    await rm(ROOT, { recursive: true, force: true })
  })

  it('list 過濾混合資料夾，僅回傳含 novel.json 的目錄', async () => {
    await workspaceHandlers.create(ROOT, { name: '鹿鼎記' })
    await workspaceHandlers.create(ROOT, { name: '射雕英雄傳' })
    // 加一個沒有 novel.json 的雜訊資料夾
    await mkdir(path.join(ROOT, '空殼資料夾'), { recursive: true })
    await writeFile(path.join(ROOT, '空殼資料夾', 'note.txt'), 'not a novel')

    const list = await workspaceHandlers.list(ROOT)
    expect(list.map((n) => n.name).sort()).toEqual(['射雕英雄傳', '鹿鼎記'])
  })

  it('open 同名小說不需確認；切到另一本回 requiresConfirmation=true，未確認時不改變 active', async () => {
    await workspaceHandlers.create(ROOT, { name: '鹿鼎記' })
    await workspaceHandlers.create(ROOT, { name: '射雕英雄傳' })

    const openA = await workspaceHandlers.open(ROOT, '鹿鼎記')
    expect(openA.requiresConfirmation).toBe(false)
    expect(openA.activeNovelName).toBe('鹿鼎記')

    const switchAttempt = await workspaceHandlers.open(ROOT, '射雕英雄傳')
    expect(switchAttempt.requiresConfirmation).toBe(true)
    expect(switchAttempt.activeNovelName).toBe('鹿鼎記')

    const confirmed = await workspaceHandlers.open(ROOT, '射雕英雄傳', { confirmed: true })
    expect(confirmed.requiresConfirmation).toBe(false)
    expect(confirmed.activeNovelName).toBe('射雕英雄傳')

    workspaceHandlers.close()
    expect((await workspaceHandlers.detectActive()).activeNovelName).toBeNull()
  })
})
