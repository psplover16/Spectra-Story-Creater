<script setup lang="ts">
import type { AuditInconclusive } from '@/types/audit'

defineProps<{
  inconclusive: AuditInconclusive
}>()
</script>

<template>
  <div data-testid="inconclusive-warning" class="p-3 rounded-md bg-amber-50 text-amber-800 text-sm">
    <p class="font-medium">⚠ 一致性檢查無法判定</p>
    <p class="mt-1">
      {{ inconclusive.reason }}
    </p>
    <p class="text-xs mt-1" data-testid="inconclusive-missing">
      缺欄位：{{ inconclusive.missingSlices.join('、') }}
    </p>
  </div>
</template>
