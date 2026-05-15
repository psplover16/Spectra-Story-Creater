<script setup lang="ts">
import SuggestionSourceBadge from '@/components/ai/SuggestionSourceBadge.vue'
import type { AiSource, HitLayer } from '@/types/ai'
import type { AuditFinding, AuditResult } from '@/types/audit'

export interface SuggestionContent {
  /** 具體可採用的方案描述（D8 強建議內容） */
  actionableSuggestion: string
  source: AiSource
  hitLayer: HitLayer
}

const props = withDefaults(
  defineProps<{
    current: SuggestionContent | null
    isLoading?: boolean
    pendingFindings?: AuditResult | null
    pendingFindingsInconclusive?: boolean
  }>(),
  {
    isLoading: false,
    pendingFindings: null,
    pendingFindingsInconclusive: false,
  },
)

const emit = defineEmits<{
  request: []
}>()

function categoryLabel(category: AuditFinding['category']): string {
  switch (category) {
    case 'ooc':
      return '角色 OOC'
    case 'unexplained-ability':
      return '能力憑空出現'
    case 'relationship-conflict':
      return '關係矛盾'
    case 'worldview-conflict':
      return '世界觀矛盾'
    case 'timeline-conflict':
      return '時間線錯亂'
    default:
      return category
  }
}

function findingsArray(result: AuditResult | null): AuditFinding[] {
  if (result === null) return []
  if (result.kind === 'findings') return result.findings
  return []
}

function requestSuggestion(): void {
  emit('request')
}
</script>

<template>
  <section data-testid="suggestion-panel" class="space-y-3">
    <button
      type="button"
      data-testid="suggestion-request"
      :disabled="props.isLoading"
      class="px-3 py-1 rounded-md bg-slate-800 text-white text-sm disabled:opacity-50"
      @click="requestSuggestion"
    >
      給我建議
    </button>
    <div v-if="props.current" data-testid="suggestion-content" class="p-3 bg-slate-50 rounded-md">
      <SuggestionSourceBadge :source="props.current.source" :hit-layer="props.current.hitLayer" />
      <p class="mt-1" data-testid="suggestion-actionable">
        {{ props.current.actionableSuggestion }}
      </p>
    </div>
    <div
      v-if="props.pendingFindings !== null"
      data-testid="suggestion-findings-warning"
      class="p-3 rounded-md border border-red-300 bg-red-50 text-sm text-red-800"
    >
      <p class="font-medium">本建議與既有設定不一致</p>
      <ul v-if="findingsArray(props.pendingFindings).length > 0" class="mt-1 space-y-1 list-disc list-inside">
        <li
          v-for="(f, idx) in findingsArray(props.pendingFindings)"
          :key="idx"
          data-testid="suggestion-finding-item"
        >
          <span class="font-medium">{{ categoryLabel(f.category) }}</span
          ><span class="text-slate-700">：{{ f.evidence }}</span>
        </li>
      </ul>
      <p
        v-if="props.pendingFindingsInconclusive"
        data-testid="suggestion-findings-inconclusive"
        class="mt-1 text-xs text-red-700"
      >
        部分偵測無法確定，請審慎採用。
      </p>
    </div>
  </section>
</template>
