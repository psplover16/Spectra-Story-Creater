<script setup lang="ts">
import type { AiInvocationRecord } from '@/services/ai/aiInvocationHistory'

const props = defineProps<{
  records: AiInvocationRecord[]
  limit?: number
}>()

const shown = (props.records ?? []).slice(0, props.limit ?? 20)
</script>

<template>
  <ul data-testid="ai-invocation-log" class="space-y-1">
    <li
      v-for="(record, idx) in shown"
      :key="idx"
      :data-testid="`log-${idx}`"
      class="text-xs text-slate-600 px-2 py-1 rounded-md bg-slate-50"
    >
      {{ record.invokedAt }} ｜ {{ record.source }}（{{ record.hitLayer }}） ｜ role={{
        record.role
      }}
      ｜ {{ record.durationMs }}ms ｜ {{ record.status }}
    </li>
  </ul>
</template>
