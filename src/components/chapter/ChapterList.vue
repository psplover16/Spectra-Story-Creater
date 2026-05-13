<script setup lang="ts">
import type { Chapter } from '@/types/chapter'

const props = defineProps<{
  chapters: Chapter[]
}>()

const emit = defineEmits<{
  reorder: [chapters: Array<{ id: string; index: number }>]
  open: [chapterId: string]
}>()

function reorderChapter(chapterId: string, toIndex: number): void {
  const sorted = [...props.chapters].sort((a, b) => a.index - b.index)
  const fromPos = sorted.findIndex((c) => c.id === chapterId)
  if (fromPos === -1) return
  const movingItem = sorted[fromPos]!
  const without = sorted.filter((c) => c.id !== chapterId)
  const clampedToIndex = Math.max(1, Math.min(toIndex, sorted.length))
  without.splice(clampedToIndex - 1, 0, movingItem)
  const reindexed = without.map((c, i) => ({ id: c.id, index: i + 1 }))
  emit('reorder', reindexed)
}

defineExpose({ reorderChapter })
</script>

<template>
  <ol data-testid="chapter-list" class="space-y-1">
    <li
      v-for="chapter in [...chapters].sort((a, b) => a.index - b.index)"
      :key="chapter.id"
      :data-testid="`chapter-${chapter.id}`"
      class="px-3 py-2 rounded-md bg-slate-50 hover:bg-slate-100 cursor-pointer flex items-center"
      @click="emit('open', chapter.id)"
    >
      <span class="text-xs text-slate-400 w-8">{{ chapter.index }}</span>
      <span class="flex-1">{{ chapter.title }}</span>
    </li>
  </ol>
</template>
