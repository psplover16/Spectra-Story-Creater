import { ref, type Ref } from 'vue'

import { useSuggestionRequest } from './useSuggestionRequest'
import { createAiResolver } from '@/services/ai/aiResolver'
import { createContextAssembler } from '@/services/ai/contextAssembler'
import { buildPrompt } from '@/services/ai/promptBuilder'
import type { useAiSettingsStore } from '@/stores/aiSettings'
import type {
  AiAdapter,
  AiSource,
  AssembledContext,
  ResolveQuery,
} from '@/types/ai'
import type { AuditResult } from '@/types/audit'
import type { Character } from '@/types/character'
import type { Chapter } from '@/types/chapter'
import type { EquipmentItem } from '@/types/equipment'
import type { Novel } from '@/types/novel'
import type { SuggestionContent } from '@/components/ai/SuggestionPanel.vue'

const DEFAULT_ROLE = 'plot-driver' as const

export interface CliFallbackPromptState {
  failedSource: AiSource
  resolve: (decision: 'retry' | 'switch' | 'cancel') => void
}

export interface UseSuggestionFlowDeps {
  novelDir: Ref<string | null>
  adapters: { codex: AiAdapter; claude: AiAdapter }
  aiSettings: ReturnType<typeof useAiSettingsStore>
  loadNovel: (novelDir: string) => Promise<Novel | null>
  loadCharacters: (novelDir: string) => Promise<Character[]>
  loadChapters: (novelDir: string) => Promise<Chapter[]>
  loadEquipment?: (novelDir: string) => Promise<EquipmentItem[]>
  runAuditor: (candidate: string, context: AssembledContext) => AuditResult
}

export interface UseSuggestionFlowReturn {
  currentSuggestion: Ref<SuggestionContent | null>
  pendingFindings: Ref<AuditResult | null>
  pendingFindingsInconclusive: Ref<boolean>
  isLoading: Ref<boolean>
  cliFallbackPrompt: Ref<CliFallbackPromptState | null>
  requestSuggestion: (chapterId: string) => Promise<void>
}

export function useSuggestionFlow(deps: UseSuggestionFlowDeps): UseSuggestionFlowReturn {
  const currentSuggestion = ref<SuggestionContent | null>(null)
  const pendingFindings = ref<AuditResult | null>(null)
  const pendingFindingsInconclusive = ref<boolean>(false)
  const isLoading = ref<boolean>(false)
  const cliFallbackPrompt = ref<CliFallbackPromptState | null>(null)

  const paragraphBindings = () =>
    deps.aiSettings.binding.paragraphBindings as Record<string, AiSource | undefined>
  const roleBindings = () =>
    deps.aiSettings.binding.roleBindings as Record<string, AiSource | undefined>
  const characterBindings = () =>
    deps.aiSettings.binding.characterBindings as Record<string, AiSource | undefined>

  const resolver = createAiResolver({
    getParagraphBinding: (id) => paragraphBindings()[id],
    getRoleBinding: (role) => roleBindings()[role],
    getCharacterBinding: (id) => characterBindings()[id],
    getGlobalDefault: () => deps.aiSettings.binding.globalDefault,
    getAdapter: (source) => deps.adapters[source],
  })

  const assembler = createContextAssembler({
    loadNovel: async (id) => {
      const n = await deps.loadNovel(id)
      if (n === null) throw new Error(`Novel not found at ${id}`)
      return n
    },
    loadCharacters: deps.loadCharacters,
    loadChapters: deps.loadChapters,
    loadEquipment: deps.loadEquipment,
  })

  async function requestSuggestion(chapterId: string): Promise<void> {
    if (deps.novelDir.value === null) return
    const novelId = deps.novelDir.value

    isLoading.value = true
    pendingFindings.value = null
    pendingFindingsInconclusive.value = false

    let context: AssembledContext
    try {
      context = await assembler.assemble({ novelId, chapterId, tokenBudget: 8000 })
    } catch (err) {
      console.warn('[useSuggestionFlow] context assembly failed', err)
      isLoading.value = false
      return
    }

    const query: ResolveQuery = { role: DEFAULT_ROLE }
    const prompt = buildPrompt({ context, role: DEFAULT_ROLE, userPrompt: '' })
    const invokeInput = { context, prompt, role: DEFAULT_ROLE }

    const request = useSuggestionRequest({
      resolver,
      getAdapter: (s) => deps.adapters[s],
      runAuditor: (candidate, ctx) => {
        try {
          return deps.runAuditor(candidate, ctx)
        } catch (err) {
          console.warn('[useSuggestionFlow] auditor threw, treating as clean', err)
          return { kind: 'clean' }
        }
      },
      promptFallback: async (failedSource) => {
        return new Promise<'retry' | 'switch' | 'cancel'>((resolveDecision) => {
          cliFallbackPrompt.value = {
            failedSource,
            resolve: (decision) => {
              cliFallbackPrompt.value = null
              resolveDecision(decision)
            },
          }
        })
      },
    })

    try {
      const result = await request.invoke({ invokeInput, query, context })

      if (result.status === 'cancelled') {
        return
      }

      const { hitLayer } = deps.aiSettings.resolveAiSource({ role: DEFAULT_ROLE })
      currentSuggestion.value = {
        actionableSuggestion: result.text ?? '',
        source: result.source ?? deps.aiSettings.binding.globalDefault,
        hitLayer,
      }

      if (result.status === 'findings' && result.findings) {
        pendingFindings.value = result.findings
        pendingFindingsInconclusive.value = false
      } else if (result.status === 'inconclusive' && result.findings) {
        pendingFindings.value = result.findings
        pendingFindingsInconclusive.value = true
      }
    } catch (err) {
      console.warn('[useSuggestionFlow] unexpected error during invoke', err)
    } finally {
      isLoading.value = false
    }
  }

  return {
    currentSuggestion,
    pendingFindings,
    pendingFindingsInconclusive,
    isLoading,
    cliFallbackPrompt,
    requestSuggestion,
  }
}
