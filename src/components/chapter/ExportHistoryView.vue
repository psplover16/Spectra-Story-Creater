<script setup lang="ts">
defineProps<{
  files: Array<{ fileName: string; filePath: string; createdAt: string }>
}>()

const emit = defineEmits<{
  open: [filePath: string]
}>()
</script>

<template>
  <ul data-testid="export-history" class="space-y-1">
    <li
      v-for="file in files"
      :key="file.filePath"
      :data-testid="`exported-${file.fileName}`"
      class="px-3 py-2 rounded-md bg-slate-50 flex items-center justify-between"
    >
      <span class="text-sm">
        {{ file.fileName }}
        <span class="text-xs text-slate-500 ml-2">{{ file.createdAt }}</span>
      </span>
      <button
        type="button"
        :data-testid="`exported-open-${file.fileName}`"
        class="text-xs underline text-slate-700"
        @click="emit('open', file.filePath)"
      >
        開啟
      </button>
    </li>
    <li v-if="files.length === 0" class="text-slate-400 text-sm">尚未匯出任何章節</li>
  </ul>
</template>
