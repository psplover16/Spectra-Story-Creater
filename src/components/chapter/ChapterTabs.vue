<script setup lang="ts">
import type { ChapterTabState } from '@/stores/workspace'

const props = defineProps<{
  tabs: ChapterTabState[]
  activeChapterId: string | null
}>()

const emit = defineEmits<{
  activate: [chapterId: string]
  close: [chapterId: string]
  open: [chapterId: string, title: string]
}>()

function requestOpen(chapterId: string, title: string): void {
  const existing = props.tabs.find((t) => t.chapterId === chapterId)
  if (existing) {
    emit('activate', chapterId)
    return
  }
  emit('open', chapterId, title)
}

defineExpose({ requestOpen })
</script>

<template>
  <nav data-testid="chapter-tabs" class="flex border-b border-slate-200">
    <button
      v-for="tab in tabs"
      :key="tab.chapterId"
      :data-testid="`tab-${tab.chapterId}`"
      :aria-selected="activeChapterId === tab.chapterId"
      :class="[
        'px-3 py-2 text-sm flex items-center gap-2',
        activeChapterId === tab.chapterId ? 'bg-white border-x border-t' : 'text-slate-600',
      ]"
      @click="emit('activate', tab.chapterId)"
    >
      <span>{{ tab.title }}</span>
      <span v-if="tab.isDirty" class="text-orange-500 text-xs">●</span>
      <span
        :data-testid="`tab-close-${tab.chapterId}`"
        class="text-slate-400 hover:text-red-500"
        @click.stop="emit('close', tab.chapterId)"
      >
        ✕
      </span>
    </button>
  </nav>
</template>
