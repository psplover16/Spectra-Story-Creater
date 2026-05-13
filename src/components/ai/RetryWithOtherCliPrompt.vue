<script setup lang="ts">
import type { AiSource } from '@/types/ai'

defineProps<{
  failedSource: AiSource
}>()

const emit = defineEmits<{
  retry: []
  switch: [target: AiSource]
  cancel: []
}>()

function otherOf(failed: AiSource): AiSource {
  return failed === 'codex' ? 'claude' : 'codex'
}
</script>

<template>
  <div data-testid="retry-other-prompt" class="space-y-1 p-2 bg-amber-50 rounded-md">
    <p class="text-sm">{{ failedSource }} 失敗。要重試還是改用 {{ otherOf(failedSource) }}？</p>
    <div class="flex gap-2">
      <button
        data-testid="retry-retry"
        class="px-2 py-0.5 text-xs bg-slate-800 text-white rounded-md"
        @click="emit('retry')"
      >
        重試
      </button>
      <button
        data-testid="retry-switch"
        class="px-2 py-0.5 text-xs bg-slate-600 text-white rounded-md"
        @click="emit('switch', otherOf(failedSource))"
      >
        改用 {{ otherOf(failedSource) }}
      </button>
      <button
        data-testid="retry-cancel"
        class="px-2 py-0.5 text-xs bg-slate-200 rounded-md"
        @click="emit('cancel')"
      >
        取消
      </button>
    </div>
  </div>
</template>
