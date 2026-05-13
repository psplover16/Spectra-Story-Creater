<script setup lang="ts">
import { ref } from 'vue'

import SuggestionSourceBadge from '@/components/ai/SuggestionSourceBadge.vue'
import type { AiSource, HitLayer } from '@/types/ai'

export interface SuggestionContent {
  /** 具體可採用的方案描述（D8 強建議內容） */
  actionableSuggestion: string
  source: AiSource
  hitLayer: HitLayer
}

defineProps<{
  current: SuggestionContent | null
}>()

const emit = defineEmits<{
  request: []
}>()

const isLoading = ref(false)

async function requestSuggestion(): Promise<void> {
  isLoading.value = true
  emit('request')
  isLoading.value = false
}
</script>

<template>
  <section data-testid="suggestion-panel" class="space-y-3">
    <button
      type="button"
      data-testid="suggestion-request"
      :disabled="isLoading"
      class="px-3 py-1 rounded-md bg-slate-800 text-white text-sm disabled:opacity-50"
      @click="requestSuggestion"
    >
      給我建議
    </button>
    <div v-if="current" data-testid="suggestion-content" class="p-3 bg-slate-50 rounded-md">
      <SuggestionSourceBadge :source="current.source" :hit-layer="current.hitLayer" />
      <p class="mt-1" data-testid="suggestion-actionable">
        {{ current.actionableSuggestion }}
      </p>
    </div>
  </section>
</template>
