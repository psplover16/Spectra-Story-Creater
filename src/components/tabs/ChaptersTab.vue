<script setup lang="ts">
import { onMounted, ref } from 'vue'

import ChapterList from '@/components/chapter/ChapterList.vue'
import { toPlain } from '@/services/ipc/toPlain'
import { useWorkspaceStore } from '@/stores/workspace'
import type { Chapter } from '@/types/chapter'

const props = defineProps<{
  novelDir: string
}>()

const emit = defineEmits<{
  'open-chapter': [chapterId: string]
  'focus-chapter': [chapterId: string]
}>()

const chapters = ref<Chapter[]>([])
const workspace = useWorkspaceStore()

async function reload(): Promise<void> {
  const list = (await window.api.chapter.list(props.novelDir)) as Chapter[]
  chapters.value = Array.isArray(list) ? list : []
}

onMounted(() => {
  void reload()
})

function handleOpen(chapterId: string): void {
  const alreadyOpen = workspace.chapterTabs.some((t) => t.chapterId === chapterId)
  if (alreadyOpen) {
    emit('focus-chapter', chapterId)
    return
  }
  emit('open-chapter', chapterId)
}

async function createChapter(): Promise<void> {
  const now = new Date().toISOString()
  const nextIndex = chapters.value.length + 1
  const chapter: Chapter = {
    id: `ch-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    index: nextIndex,
    title: `第 ${nextIndex} 章`,
    outline: '',
    scene: { location: '', time: '', weather: '', props: [], mood: '' },
    content: '',
    presentCharacters: [],
    createdAt: now,
    updatedAt: now,
  }
  await window.api.chapter.write(props.novelDir, toPlain(chapter))
  await reload()
  emit('open-chapter', chapter.id)
}

async function deleteChapter(chapterId: string): Promise<void> {
  await window.api.chapter.delete(props.novelDir, chapterId)
  await reload()
}
</script>

<template>
  <section data-testid="chapters-tab" class="p-4 space-y-4">
    <div class="flex items-center justify-between">
      <h3 class="text-sm font-medium">章節列表</h3>
      <button
        type="button"
        data-testid="chapter-create"
        class="px-3 py-1 rounded-md bg-slate-800 text-white text-sm"
        @click="createChapter"
      >
        新增章節
      </button>
    </div>
    <ChapterList :chapters="chapters" @open="handleOpen" />
    <ul v-if="chapters.length > 0" class="space-y-1">
      <li
        v-for="chapter in chapters"
        :key="chapter.id"
        class="flex items-center justify-between text-xs text-slate-500 px-3"
      >
        <span>{{ chapter.title }}</span>
        <button
          type="button"
          :data-testid="`chapter-delete-${chapter.id}`"
          class="text-red-600"
          @click="deleteChapter(chapter.id)"
        >
          刪除
        </button>
      </li>
    </ul>
  </section>
</template>
