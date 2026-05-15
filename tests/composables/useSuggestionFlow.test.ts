import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { ref, nextTick } from 'vue'

import { useSuggestionFlow } from '@/composables/useSuggestionFlow'
import { useAiSettingsStore } from '@/stores/aiSettings'
import { CliUnavailableError } from '@/services/ai/errors'
import type {
  AiAdapter,
  AiInvokeResult,
  AssembledContext,
  AiSource,
} from '@/types/ai'
import type { Character } from '@/types/character'
import type { Chapter } from '@/types/chapter'
import type { Novel } from '@/types/novel'
import type { AuditResult } from '@/types/audit'

function makeNovel(): Novel {
  return {
    id: 'n1',
    name: 'novel',
    style: '',
    worldview: [{ id: 'w1', title: '清初', content: '江湖混亂' }],
    factionsSummary: [],
    overallOutline: { summary: 'main plot', chapters: [] },
    createdAt: '',
    updatedAt: '',
  }
}

function makeCharacter(id: string, name: string): Character {
  return {
    id,
    name,
    personality: '',
    abilities: [],
    appearance: '',
    factionIds: [],
    socialStatus: '',
    relationships: [],
    notes: '',
    equipment: [],
    createdAt: '',
    updatedAt: '',
  } as Character
}

function makeChapter(id: string, presentIds: string[] = []): Chapter {
  return {
    id,
    index: 1,
    title: '第一章',
    outline: '主角抵達揚州',
    scene: { location: '揚州', time: '清晨', weather: '', props: [], mood: '' },
    content: '',
    presentCharacters: presentIds,
    createdAt: '',
    updatedAt: '',
  }
}

function makeAdapter(
  source: AiSource,
  invoke: (input: unknown) => Promise<AiInvokeResult>,
): AiAdapter {
  return { source, invoke: invoke as AiAdapter['invoke'] }
}

interface SetupOptions {
  invokeCodex?: () => Promise<AiInvokeResult>
  invokeClaude?: () => Promise<AiInvokeResult>
  auditor?: (candidate: string, context: AssembledContext) => AuditResult
  novel?: Novel | null
  chapters?: Chapter[]
  characters?: Character[]
  loadNovelThrows?: Error
}

function setup(opts: SetupOptions = {}) {
  setActivePinia(createPinia())
  const aiSettings = useAiSettingsStore()
  const codex = makeAdapter(
    'codex',
    opts.invokeCodex ??
      vi.fn(async () => ({
        text: 'codex 給的建議',
        source: 'codex' as const,
        durationMs: 1,
      })),
  )
  const claude = makeAdapter(
    'claude',
    opts.invokeClaude ??
      vi.fn(async () => ({
        text: 'claude 給的建議',
        source: 'claude' as const,
        durationMs: 1,
      })),
  )
  const novelDir = ref<string | null>('/workspace/novel')
  const novel = opts.novel ?? makeNovel()
  const chapters = opts.chapters ?? [makeChapter('ch1', ['c1'])]
  const characters = opts.characters ?? [makeCharacter('c1', '韋小寶')]
  const loadNovel = vi.fn(async () => {
    if (opts.loadNovelThrows) throw opts.loadNovelThrows
    return novel
  })
  const loadCharacters = vi.fn(async () => characters)
  const loadChapters = vi.fn(async () => chapters)
  const runAuditor = opts.auditor ?? (() => ({ kind: 'clean' as const }))
  const flow = useSuggestionFlow({
    novelDir,
    adapters: { codex, claude },
    aiSettings,
    loadNovel,
    loadCharacters,
    loadChapters,
    runAuditor,
  })
  return { flow, aiSettings, codex, claude, loadNovel, loadCharacters, loadChapters }
}

describe('useSuggestionFlow', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('composable 形狀', () => {
    it('回傳 currentSuggestion、pendingFindings、pendingFindingsInconclusive、isLoading、cliFallbackPrompt、requestSuggestion 六項', () => {
      const { flow } = setup()
      expect(flow.currentSuggestion).toBeDefined()
      expect(flow.pendingFindings).toBeDefined()
      expect(flow.pendingFindingsInconclusive).toBeDefined()
      expect(flow.isLoading).toBeDefined()
      expect(flow.cliFallbackPrompt).toBeDefined()
      expect(typeof flow.requestSuggestion).toBe('function')
      expect(flow.currentSuggestion.value).toBeNull()
      expect(flow.pendingFindings.value).toBeNull()
      expect(flow.pendingFindingsInconclusive.value).toBe(false)
      expect(flow.isLoading.value).toBe(false)
      expect(flow.cliFallbackPrompt.value).toBeNull()
    })
  })

  describe('status=ok（happy path）', () => {
    it('成功 → currentSuggestion 被設、pendingFindings 為 null', async () => {
      const { flow } = setup()
      await flow.requestSuggestion('ch1')
      expect(flow.currentSuggestion.value).not.toBeNull()
      expect(flow.currentSuggestion.value?.actionableSuggestion).toBe('codex 給的建議')
      expect(flow.pendingFindings.value).toBeNull()
    })

    it('isLoading 進入再退出：invoke 開始為 true，結束為 false', async () => {
      let snapshotMid: boolean | null = null
      const codexInvoke = vi.fn(async () => {
        await Promise.resolve()
        return { text: 'r', source: 'codex' as const, durationMs: 1 }
      })
      const { flow } = setup({ invokeCodex: codexInvoke })
      const p = flow.requestSuggestion('ch1')
      await nextTick()
      snapshotMid = flow.isLoading.value
      await p
      expect(snapshotMid).toBe(true)
      expect(flow.isLoading.value).toBe(false)
    })
  })

  describe('plot-driver role binding 被尊重', () => {
    it('plot-driver 綁定到 claude → 用 claude adapter', async () => {
      const codexInvoke = vi.fn()
      const claudeInvoke = vi.fn(async () => ({
        text: '由 claude 回應',
        source: 'claude' as const,
        durationMs: 1,
      }))
      const { flow, aiSettings } = setup({
        invokeCodex: codexInvoke,
        invokeClaude: claudeInvoke,
      })
      aiSettings.setRoleBinding('plot-driver', 'claude')
      await flow.requestSuggestion('ch1')
      expect(claudeInvoke).toHaveBeenCalledTimes(1)
      expect(codexInvoke).not.toHaveBeenCalled()
    })

    it('未設 role 綁定 → 落到 global default (codex)', async () => {
      const { flow, codex, claude } = setup()
      await flow.requestSuggestion('ch1')
      expect(codex.invoke).toHaveBeenCalledTimes(1)
      expect(claude.invoke).not.toHaveBeenCalled()
    })
  })

  describe('status=findings / inconclusive 走 inline 警示', () => {
    it('findings → currentSuggestion 被設、pendingFindings 被設、isLoading 退出', async () => {
      const findings: AuditResult = {
        kind: 'findings',
        findings: [
          { category: 'ooc', chapterId: 'ch1', evidence: '不一致證據', severity: 'medium' },
        ],
      }
      const { flow } = setup({ auditor: () => findings })
      await flow.requestSuggestion('ch1')
      expect(flow.currentSuggestion.value).not.toBeNull()
      expect(flow.pendingFindings.value).toEqual(findings)
      expect(flow.pendingFindingsInconclusive.value).toBe(false)
      expect(flow.isLoading.value).toBe(false)
    })

    it('inconclusive → pendingFindingsInconclusive=true', async () => {
      const inconclusive: AuditResult = {
        kind: 'inconclusive',
        details: { reason: '缺資料', missingSlices: ['worldview'] },
      }
      const { flow } = setup({ auditor: () => inconclusive })
      await flow.requestSuggestion('ch1')
      expect(flow.pendingFindings.value).toEqual(inconclusive)
      expect(flow.pendingFindingsInconclusive.value).toBe(true)
    })
  })

  describe('status=cancelled', () => {
    it('使用者選 cancel → currentSuggestion 不變、isLoading 退出', async () => {
      // 第一次：codex 失敗，使用者 cancel
      const codexInvoke = vi.fn(async () => {
        throw new CliUnavailableError('codex')
      })
      const { flow } = setup({ invokeCodex: codexInvoke })
      // 先預設一個 currentSuggestion 來確認 cancel 不會清掉
      flow.currentSuggestion.value = {
        actionableSuggestion: '上次的舊建議',
        source: 'codex',
        hitLayer: 'global',
      }
      const p = flow.requestSuggestion('ch1')
      // 等到 cliFallbackPrompt 出現
      await new Promise((r) => setTimeout(r, 5))
      expect(flow.cliFallbackPrompt.value).not.toBeNull()
      flow.cliFallbackPrompt.value!.resolve('cancel')
      await p
      expect(flow.currentSuggestion.value?.actionableSuggestion).toBe('上次的舊建議')
      expect(flow.pendingFindings.value).toBeNull()
      expect(flow.isLoading.value).toBe(false)
      expect(flow.cliFallbackPrompt.value).toBeNull()
    })
  })

  describe('CLI fallback', () => {
    it('cliFallbackPrompt 被設並含 failedSource', async () => {
      const codexInvoke = vi.fn(async () => {
        throw new CliUnavailableError('codex')
      })
      const { flow } = setup({ invokeCodex: codexInvoke })
      const p = flow.requestSuggestion('ch1')
      await new Promise((r) => setTimeout(r, 5))
      expect(flow.cliFallbackPrompt.value?.failedSource).toBe('codex')
      flow.cliFallbackPrompt.value!.resolve('cancel')
      await p
    })

    it('resolve switch → 切到 claude 重試成功', async () => {
      let codexCalls = 0
      const codexInvoke = vi.fn(async () => {
        codexCalls += 1
        throw new CliUnavailableError('codex')
      })
      const claudeInvoke = vi.fn(async () => ({
        text: 'claude 救援回應',
        source: 'claude' as const,
        durationMs: 1,
      }))
      const { flow } = setup({ invokeCodex: codexInvoke, invokeClaude: claudeInvoke })
      const p = flow.requestSuggestion('ch1')
      await new Promise((r) => setTimeout(r, 5))
      expect(flow.cliFallbackPrompt.value).not.toBeNull()
      flow.cliFallbackPrompt.value!.resolve('switch')
      await p
      expect(claudeInvoke).toHaveBeenCalledTimes(1)
      expect(flow.currentSuggestion.value?.actionableSuggestion).toBe('claude 救援回應')
    })

    it('fallback dialog 開啟期間 isLoading 維持 true', async () => {
      const codexInvoke = vi.fn(async () => {
        throw new CliUnavailableError('codex')
      })
      const { flow } = setup({ invokeCodex: codexInvoke })
      const p = flow.requestSuggestion('ch1')
      await new Promise((r) => setTimeout(r, 5))
      expect(flow.cliFallbackPrompt.value).not.toBeNull()
      expect(flow.isLoading.value).toBe(true)
      flow.cliFallbackPrompt.value!.resolve('cancel')
      await p
    })
  })

  describe('不快取上次結果', () => {
    it('連續兩次 invoke：第二次完成前 currentSuggestion 仍為第一次內容；第二次完成後覆蓋', async () => {
      let callCount = 0
      const codexInvoke = vi.fn(async () => {
        callCount += 1
        return {
          text: `第 ${callCount} 次回應`,
          source: 'codex' as const,
          durationMs: 1,
        }
      })
      const { flow } = setup({ invokeCodex: codexInvoke })
      await flow.requestSuggestion('ch1')
      expect(flow.currentSuggestion.value?.actionableSuggestion).toBe('第 1 次回應')
      await flow.requestSuggestion('ch1')
      expect(flow.currentSuggestion.value?.actionableSuggestion).toBe('第 2 次回應')
      expect(codexInvoke).toHaveBeenCalledTimes(2)
    })
  })

  describe('failure modes', () => {
    it('loadNovel 拋例外（contextAssembler 上游）→ isLoading=false、不丟例外給 caller', async () => {
      const { flow } = setup({ loadNovelThrows: new Error('disk full') })
      await flow.requestSuggestion('ch1')
      expect(flow.isLoading.value).toBe(false)
    })

    it('adapter 拋非 CLI 例外 → isLoading=false、不丟例外', async () => {
      const codexInvoke = vi.fn(async () => {
        throw new Error('unexpected runtime error')
      })
      const { flow } = setup({ invokeCodex: codexInvoke })
      await flow.requestSuggestion('ch1')
      expect(flow.isLoading.value).toBe(false)
    })

    it('auditor 例外 → console.warn 並視為 ok（currentSuggestion 仍被設）', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      const { flow } = setup({
        auditor: () => {
          throw new Error('auditor crashed')
        },
      })
      await flow.requestSuggestion('ch1')
      expect(flow.currentSuggestion.value).not.toBeNull()
      expect(flow.pendingFindings.value).toBeNull()
      expect(warn).toHaveBeenCalled()
      warn.mockRestore()
    })
  })
})
