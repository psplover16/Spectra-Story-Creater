<script setup lang="ts">
import type { CollaborationMode } from '@/types/collaboration'

export type { CollaborationMode }

const props = defineProps<{
  active: CollaborationMode | null
}>()

const emit = defineEmits<{
  select: [mode: CollaborationMode]
}>()

const MODES: Array<{ key: CollaborationMode; label: string; description: string }> = [
  { key: 'companion', label: '陪寫模式', description: 'AI 與你來回對話，你主寫' },
  { key: 'ghostwriter', label: '代筆模式', description: 'AI 直接擴寫長段內容' },
  { key: 'auto', label: '自動模式', description: '依互動長度與頻率動態切換' },
]

function pick(mode: CollaborationMode): void {
  emit('select', mode)
}

defineExpose({ active: props.active })
</script>

<template>
  <section class="p-6 max-w-2xl mx-auto" data-testid="collab-mode-select">
    <h2 class="text-lg font-semibold mb-4">挑選協作模式</h2>
    <div class="grid grid-cols-3 gap-3">
      <button
        v-for="mode in MODES"
        :key="mode.key"
        type="button"
        :data-testid="`collab-mode-${mode.key}`"
        :class="[
          'p-4 rounded-md border text-left',
          active === mode.key
            ? 'border-slate-800 bg-slate-100'
            : 'border-slate-200 hover:bg-slate-50',
        ]"
        @click="pick(mode.key)"
      >
        <p class="font-medium">
          {{ mode.label }}
        </p>
        <p class="text-xs text-slate-600 mt-1">
          {{ mode.description }}
        </p>
      </button>
    </div>
  </section>
</template>
