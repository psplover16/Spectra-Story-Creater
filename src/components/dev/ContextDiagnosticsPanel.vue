<script setup lang="ts">
import type { ContextDiagnosticsView } from '@/services/ai/contextDiagnostics'

defineProps<{
  view: ContextDiagnosticsView
}>()
</script>

<template>
  <section data-testid="context-diagnostics-panel" class="text-sm space-y-2">
    <p>總被剔除 slice：{{ view.totalSkipped }}</p>
    <div>
      <p class="font-medium">超出 budget：</p>
      <ul class="ml-4 list-disc">
        <li v-for="id in view.skippedByBudget" :key="id">
          {{ id }}
        </li>
      </ul>
    </div>
    <div>
      <p class="font-medium">單一過大：</p>
      <ul class="ml-4 list-disc">
        <li v-for="id in view.skippedBySize" :key="id">
          {{ id }}
        </li>
      </ul>
    </div>
  </section>
</template>
