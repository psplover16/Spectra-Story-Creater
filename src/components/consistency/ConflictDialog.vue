<script setup lang="ts">
import type { AuditFinding } from '@/types/audit'

defineProps<{
  findings: AuditFinding[]
}>()

const emit = defineEmits<{
  rewrite: []
  updateSetup: [findingIndex: number]
  ignore: [findingIndex: number]
}>()
</script>

<template>
  <div data-testid="conflict-dialog" class="p-4 bg-white rounded-md border border-slate-200">
    <h3 class="text-base font-semibold mb-2">偵測到 {{ findings.length }} 個不一致</h3>
    <ul class="space-y-2">
      <li
        v-for="(finding, idx) in findings"
        :key="idx"
        :data-testid="`finding-${idx}`"
        class="p-2 rounded-md bg-slate-50"
      >
        <p class="text-sm font-medium">[{{ finding.category }}] {{ finding.evidence }}</p>
        <div class="flex gap-2 mt-1">
          <button
            type="button"
            data-testid="conflict-rewrite"
            class="px-2 py-1 rounded-md bg-slate-800 text-white text-xs"
            @click="emit('rewrite')"
          >
            我重寫這段
          </button>
          <button
            type="button"
            :data-testid="`conflict-update-${idx}`"
            class="px-2 py-1 rounded-md bg-slate-600 text-white text-xs"
            @click="emit('updateSetup', idx)"
          >
            修改設定
          </button>
          <button
            type="button"
            :data-testid="`conflict-ignore-${idx}`"
            class="px-2 py-1 rounded-md bg-slate-200 text-xs"
            @click="emit('ignore', idx)"
          >
            忽略
          </button>
        </div>
      </li>
    </ul>
  </div>
</template>
