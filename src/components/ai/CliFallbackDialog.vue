<script setup lang="ts">
import type { AiSource } from '@/types/ai'

defineProps<{
  failedSource: AiSource
  errorMessage: string
}>()

const emit = defineEmits<{
  retry: []
  switch: [target: AiSource]
  cancel: []
}>()

function targetOf(failed: AiSource): AiSource {
  return failed === 'codex' ? 'claude' : 'codex'
}
</script>

<template>
  <div data-testid="cli-fallback-dialog" class="p-4 bg-white rounded-md border border-slate-200">
    <h3 class="text-base font-semibold mb-2">{{ failedSource }} CLI 無法使用</h3>
    <p class="text-sm text-slate-600 mb-3">
      {{ errorMessage }}
    </p>
    <div class="flex gap-2">
      <button
        type="button"
        data-testid="cli-fallback-retry"
        class="px-3 py-1 rounded-md bg-slate-800 text-white text-sm"
        @click="emit('retry')"
      >
        重試
      </button>
      <button
        type="button"
        data-testid="cli-fallback-switch"
        class="px-3 py-1 rounded-md bg-slate-600 text-white text-sm"
        @click="emit('switch', targetOf(failedSource))"
      >
        改用 {{ targetOf(failedSource) }}
      </button>
      <button
        type="button"
        data-testid="cli-fallback-cancel"
        class="px-3 py-1 rounded-md bg-slate-200 text-sm"
        @click="emit('cancel')"
      >
        取消本次
      </button>
    </div>
  </div>
</template>
