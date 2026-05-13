<script setup lang="ts">
import { computed } from 'vue'

import type { FactionSituationHistoryEntry } from '@/types/faction'

const props = defineProps<{
  entries: FactionSituationHistoryEntry[]
}>()

const sortedDesc = computed(() => [...props.entries].sort((a, b) => b.at.localeCompare(a.at)))
</script>

<template>
  <ul data-testid="faction-history" class="space-y-1">
    <li
      v-for="(entry, idx) in sortedDesc"
      :key="idx"
      :data-testid="`history-${idx}`"
      class="px-3 py-2 rounded-md bg-slate-50 text-sm"
    >
      <p class="text-xs text-slate-500">
        {{ entry.at }}
      </p>
      <p>{{ entry.previousSituation }} → {{ entry.newSituation }}</p>
    </li>
    <li v-if="sortedDesc.length === 0" class="text-slate-400 text-sm">無 situation 變更紀錄</li>
  </ul>
</template>
