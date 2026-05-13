<script setup lang="ts">
import type { ChapterBranch } from '@/types/chapter'

defineProps<{
  branches: ChapterBranch[]
}>()

const emit = defineEmits<{
  activate: [branchId: string]
}>()
</script>

<template>
  <ul data-testid="branch-list" class="space-y-1">
    <li
      v-for="branch in branches"
      :key="branch.id"
      :data-testid="`branch-${branch.branchName}`"
      class="px-3 py-2 rounded-md bg-slate-50 flex items-center justify-between"
    >
      <span>
        {{ branch.branchName }}
        <span class="text-xs text-slate-500 ml-2">{{ branch.branchedAt }}</span>
      </span>
      <button
        type="button"
        :data-testid="`branch-activate-${branch.id}`"
        class="text-xs text-slate-700 underline"
        @click="emit('activate', branch.id)"
      >
        套用
      </button>
    </li>
  </ul>
</template>
