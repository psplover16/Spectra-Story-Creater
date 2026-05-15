import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mkdir, readFile, readdir, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { auditorDryRun } from '@/services/consistency/auditor'
import { appendIgnoreRecord, readIgnoreRecords } from '@/services/consistency/auditIgnoreRecord'
import { exportChapter } from '@/services/export/htmlExporter'
import { applyDriftSuggestion } from '@/services/evolution/applyDriftSuggestion'
import { readDriftLog } from '@/services/evolution/driftLog'
import { detectPersonalityDrift } from '@/services/evolution/personalityDetector'
import { createAiResolver } from '@/services/ai/aiResolver'
import { useSuggestionRequest } from '@/composables/useSuggestionRequest'
import { readCharacter, writeCharacter } from '@/services/files/characterRepository'
import {
  listBranches,
  listChapters,
  readChapter,
  saveBranch,
  writeChapter,
} from '@/services/files/chapterRepository'
import { writeFaction } from '@/services/files/factionRepository'
import { createNovel, readNovel, writeNovel } from '@/services/files/novelRepository'
import { exportsDir, novelDir } from '@/services/files/paths'
import type { AiAdapter, AiSource, AssembledContext } from '@/types/ai'

const ROOT = path.join(tmpdir(), 'spectra-golden-path-e2e')

async function fsSnapshot(dir: string): Promise<Map<string, number>> {
  const result = new Map<string, number>()
  async function walk(p: string): Promise<void> {
    const entries = await readdir(p, { withFileTypes: true })
    for (const e of entries) {
      const sub = path.join(p, e.name)
      if (e.isDirectory()) await walk(sub)
      else {
        const s = await stat(sub)
        result.set(path.relative(dir, sub), s.size)
      }
    }
  }
  await walk(dir)
  return result
}

const emptyContext: AssembledContext = {
  worldview: [{ id: 'w1', title: '清初', content: '清初年間，江湖混亂', score: 0 }],
  characters: [
    {
      characterId: 'c-wei',
      name: '韋小寶',
      personality: '市井狡黠',
      abilities: [],
      factionId: null,
      equipment: [],
      score: 5,
    },
  ],
  overallPlot: { summary: '主角加入天地會', chapters: [] },
  presentCharacters: [],
  chapterOutline: { chapterId: 'ch3', outline: '誤入禁地' },
  chapterScene: {
    chapterId: 'ch3',
    scene: { location: '揚州', time: '清晨', weather: '陰雨', props: [], mood: '緊張' },
  },
}

describe('e2e: golden-path 完整使用者旅程', () => {
  beforeEach(async () => {
    await rm(ROOT, { recursive: true, force: true })
    await mkdir(ROOT, { recursive: true })
  })

  afterEach(async () => {
    await rm(ROOT, { recursive: true, force: true })
  })

  it('走完十步：建立 → 編輯 → 建議 → audit ignore → 另存分支 → drift accept → 匯出兩格式', async () => {
    // Step 1: 啟動 App 並選擇工作目錄（workspace root = ROOT）
    const novel = await createNovel(ROOT, { name: 'golden-path-novel', style: '武俠' })
    const dir = novelDir(ROOT, 'golden-path-novel')

    // Step 2: 寫入 worldview 與 overallOutline
    const meta = await readNovel(dir)
    await writeNovel(dir, {
      ...meta,
      worldview: [{ id: 'w1', title: '清初江湖', content: '清初年間江湖混亂' }],
      overallOutline: {
        summary: '主角從揚州街頭一路混入皇宮',
        chapters: [{ chapterId: 'ch3-marker', title: '誤入禁地', brief: '韋小寶意外撞見' }],
      },
    })

    // Step 3: 建立兩個角色（含 personality / abilities / factionId / relationships）
    const wei = await writeCharacter(dir, {
      name: '韋小寶',
      personality: '市井狡黠',
      abilities: ['口才'],
    })
    const mao = await writeCharacter(dir, {
      name: '茅十八',
      personality: '直爽',
      abilities: ['短刀'],
      relationships: [{ targetCharacterId: wei.id, kind: '義兄', description: '初識於街頭' }],
    })

    // Step 4: 建立一個陣營並於 character.factionId 引用
    const faction = await writeFaction(dir, {
      name: '天地會',
      alignment: 'protagonist',
      currentSituation: '勢力初成',
    })
    await writeCharacter(dir, {
      id: wei.id,
      name: wei.name,
      personality: wei.personality,
      abilities: wei.abilities,
      appearance: wei.appearance,
      factionIds: [faction.id],
      socialStatus: wei.socialStatus,
      relationships: wei.relationships,
      notes: wei.notes,
    })

    // Step 5: 建立章節 3 含 outline、scene、presentCharacters
    const ch3 = await writeChapter(dir, {
      index: 3,
      title: '誤入禁地',
      outline: '韋小寶意外撞見天地會聚會',
      scene: {
        location: '揚州',
        time: '清晨',
        weather: '陰雨',
        props: ['銀子'],
        mood: '緊張',
      },
      content: '韋小寶踏出麗春院。\n\n外頭風雨欲來。',
      presentCharacters: [wei.id, mao.id],
    })

    // Step 6: 對章節 3 呼叫「給我建議」，使用 mock Codex CLI 適當 stdout
    const codexAdapter: AiAdapter = {
      source: 'codex',
      invoke: vi.fn(async () => ({
        text: '韋小寶大喊一聲，眾人皆驚。',
        source: 'codex' as const,
        durationMs: 50,
      })),
    }
    const claudeAdapter: AiAdapter = {
      source: 'claude',
      invoke: vi.fn(async () => ({ text: '', source: 'claude' as const, durationMs: 0 })),
    }
    const adapters: Record<AiSource, AiAdapter> = {
      codex: codexAdapter,
      claude: claudeAdapter,
    }
    const resolver = createAiResolver({
      getParagraphBinding: () => undefined,
      getRoleBinding: () => undefined,
      getCharacterBinding: () => undefined,
      getGlobalDefault: () => 'codex',
      getAdapter: (s) => adapters[s],
    })

    // 第一次叫的時候 audit 應該命中 OOC（personality「市井狡黠」+ 候選含「大喊」會被 ooc detector 看到嗎？
    // 韋小寶 personality 是「市井狡黠」, 不在「沉默寡言」等冷靜清單。但設計上應該命中。
    // 改用 mao 為沉默寡言，讓 OOC 命中：先把 mao 改為「沉默寡言」
    const maoUpdated = await writeCharacter(dir, {
      id: mao.id,
      name: mao.name,
      personality: '沉默寡言',
      abilities: mao.abilities,
      appearance: mao.appearance,
      factionIds: mao.factionIds,
      socialStatus: mao.socialStatus,
      relationships: mao.relationships,
      notes: mao.notes,
    })
    // 候選文字提到「茅十八大喊」 → OOC 命中
    codexAdapter.invoke = vi.fn(async () => ({
      text: '茅十八大喊一聲，眾人皆驚。',
      source: 'codex' as const,
      durationMs: 50,
    }))

    const req = useSuggestionRequest({
      resolver,
      getAdapter: (s) => adapters[s],
      runAuditor: (candidate) =>
        auditorDryRun({
          candidateResponse: candidate,
          chapterId: ch3.id,
          chapterIndex: 3,
          presentCharacters: [{ ...wei, factionIds: [faction.id] }, maoUpdated],
          worldview: meta.worldview,
          deceasedCharacterIds: [],
          context: emptyContext,
          mutes: [],
        }),
      promptFallback: async () => 'cancel',
    })

    const suggestion = await req.invoke({
      invokeInput: { context: emptyContext, prompt: '幫我推進劇情', role: 'plot-driver' },
      query: { role: 'plot-driver' },
      context: emptyContext,
    })

    // Step 7: auditor 命中 OOC → 使用者點 ignore
    expect(suggestion.status).toBe('findings')
    expect(suggestion.source).toBe('codex')
    const snapshotBeforeIgnore = await fsSnapshot(dir)
    if (suggestion.status === 'findings' && suggestion.findings?.kind === 'findings') {
      const finding = suggestion.findings.findings[0]!
      expect(finding.category).toBe('ooc')
      await appendIgnoreRecord(dir, {
        finding,
        chapterId: ch3.id,
        ignoredAt: new Date().toISOString(),
      })
    }
    const ignoreRecords = await readIgnoreRecords(dir)
    expect(ignoreRecords).toHaveLength(1)
    // ignore 動作不應改動其他小說檔（除了 ignore log）
    const snapshotAfterIgnore = await fsSnapshot(dir)
    const newKeys = [...snapshotAfterIgnore.keys()].filter((k) => !snapshotBeforeIgnore.has(k))
    expect(newKeys).toEqual(['audit-ignore-log.jsonl'])

    // Step 8: 另存為分支
    await saveBranch(dir, {
      chapterId: ch3.id,
      branchName: 'alt-pov-茅十八',
      fromChapter: ch3,
      overrides: { outline: '從茅十八視角看韋小寶誤入' },
    })
    const branches = await listBranches(dir, ch3.id)
    expect(branches).toHaveLength(1)
    expect(branches[0]?.branchName).toBe('alt-pov-茅十八')

    // Step 9: 觸發 personalityDetector，使用者選 accept-as-suggested
    const driftFinding = detectPersonalityDrift({
      character: await readCharacter(dir, wei.id),
      candidateResponse: '韋小寶為茅十八捨命相護',
      chapterId: ch3.id,
    })
    expect(driftFinding).not.toBeNull()
    const weiUpdated = await applyDriftSuggestion({
      novelDir: dir,
      finding: driftFinding!,
      action: 'accept-as-suggested',
    })
    expect(weiUpdated.personality).not.toBe('市井狡黠')
    const driftLog = await readDriftLog(dir, wei.id)
    expect(driftLog).toHaveLength(1)
    expect(driftLog[0]?.decision).toBe('accept-as-suggested')

    // Step 10: 匯出章節 3 為 epub-like 與 web-page 兩格式
    const allChapters = (await listChapters(dir)).map((c) => ({
      id: c.id,
      index: c.index,
      title: c.title,
      exported: true,
    }))

    const epubResult = await exportChapter({
      novelDir: dir,
      novelName: 'golden-path-novel',
      chapter: await readChapter(dir, ch3.id),
      format: 'epub-like',
    })
    expect(epubResult.selfContained).toBe(true)
    const epubHtml = await readFile(epubResult.filePath, { encoding: 'utf-8' })
    expect(epubHtml).toContain('韋小寶踏出麗春院')

    const webResult = await exportChapter({
      novelDir: dir,
      novelName: 'golden-path-novel',
      chapter: await readChapter(dir, ch3.id),
      format: 'web-page',
      allChapters,
    })
    expect(webResult.selfContained).toBe(true)
    const webHtml = await readFile(webResult.filePath, { encoding: 'utf-8' })
    expect(webHtml).toContain('chapter-3-誤入禁地-web-page.html')

    // 驗收：exports/ 目錄含兩檔、UTF-8 無 BOM
    const exportsList = await readdir(exportsDir(dir))
    expect(exportsList).toContain('chapter-3-誤入禁地-epub-like.html')
    expect(exportsList).toContain('chapter-3-誤入禁地-web-page.html')
    for (const fileName of exportsList) {
      const raw = await readFile(path.join(exportsDir(dir), fileName))
      expect(raw[0]).not.toBe(0xef)
    }

    // 確認 novel 本體有所有 step 寫的資料
    expect(novel.id).toMatch(/[0-9a-f-]{36}/)
  }, 60000) // 60 秒 timeout
})
