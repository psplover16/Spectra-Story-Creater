<script setup lang="ts">
import { computed } from 'vue'

import type { AiSource, HitLayer } from '@/types/ai'

const props = defineProps<{
  source: AiSource
  hitLayer: HitLayer
}>()

const sourceLabel = computed(() => (props.source === 'codex' ? 'Codex' : 'Claude'))
const layerLabel = computed(() => {
  switch (props.hitLayer) {
    case 'paragraph':
      return '段落覆寫'
    case 'role':
      return '職能綁定'
    case 'character':
      return '角色綁定'
    case 'global':
      return '全域預設'
  }
  return props.hitLayer
})
</script>

<template>
  <span data-testid="suggestion-source-badge" class="text-xs text-slate-600">
    本次由 {{ sourceLabel }} 產生（{{ layerLabel }}）
  </span>
</template>
