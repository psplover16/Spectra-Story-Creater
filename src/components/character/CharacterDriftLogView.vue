<script setup lang="ts">
import { computed, ref } from 'vue'

import type { DriftFinding } from '@/types/character'

const props = defineProps<{
  findings: DriftFinding[]
  pageSize?: number
}>()

const currentPage = ref(0)
const size = computed(() => props.pageSize ?? 10)

const pageItems = computed(() => {
  const start = currentPage.value * size.value
  return props.findings.slice(start, start + size.value)
})

const totalPages = computed(() => Math.max(1, Math.ceil(props.findings.length / size.value)))
</script>

<template>
  <section data-testid="drift-log-view">
    <ul class="space-y-1">
      <li
        v-for="(finding, idx) in pageItems"
        :key="`${finding.detectedAt}-${idx}`"
        :data-testid="`drift-entry-${currentPage * size + idx}`"
        class="px-3 py-2 rounded-md bg-slate-50 text-sm"
      >
        <p class="text-xs text-slate-500">{{ finding.detectedAt }} ｜ {{ finding.chapterId }}</p>
        <p>{{ finding.evidence }}</p>
      </li>
    </ul>
    <div class="flex items-center gap-2 mt-2">
      <button
        type="button"
        data-testid="drift-page-prev"
        :disabled="currentPage === 0"
        class="px-2 py-0.5 text-xs rounded-md bg-slate-200 disabled:opacity-50"
        @click="currentPage = Math.max(0, currentPage - 1)"
      >
        上一頁
      </button>
      <span class="text-xs">{{ currentPage + 1 }} / {{ totalPages }}</span>
      <button
        type="button"
        data-testid="drift-page-next"
        :disabled="currentPage >= totalPages - 1"
        class="px-2 py-0.5 text-xs rounded-md bg-slate-200 disabled:opacity-50"
        @click="currentPage = Math.min(totalPages - 1, currentPage + 1)"
      >
        下一頁
      </button>
    </div>
  </section>
</template>
