<script setup lang="ts">
import type { DriftFinding } from '@/types/character'

defineProps<{
  finding: DriftFinding
}>()

const emit = defineEmits<{
  acceptAsSuggested: []
  editThenAccept: []
  dismiss: []
}>()
</script>

<template>
  <div data-testid="drift-suggestion-panel" class="p-3 bg-amber-50 rounded-md">
    <p class="text-sm font-medium">偵測到性格演化建議</p>
    <p class="text-xs text-slate-700 mt-1" data-testid="drift-evidence">
      {{ finding.evidence }}
    </p>
    <p class="text-xs mt-2" data-testid="drift-suggested">
      建議改寫：{{ finding.suggestedRewrite }}
    </p>
    <div class="flex gap-2 mt-2">
      <button
        type="button"
        data-testid="drift-accept"
        class="px-2 py-0.5 rounded-md bg-slate-800 text-white text-xs"
        @click="emit('acceptAsSuggested')"
      >
        接受建議
      </button>
      <button
        type="button"
        data-testid="drift-edit"
        class="px-2 py-0.5 rounded-md bg-slate-600 text-white text-xs"
        @click="emit('editThenAccept')"
      >
        編輯後接受
      </button>
      <button
        type="button"
        data-testid="drift-dismiss"
        class="px-2 py-0.5 rounded-md bg-slate-200 text-xs"
        @click="emit('dismiss')"
      >
        忽略
      </button>
    </div>
  </div>
</template>
