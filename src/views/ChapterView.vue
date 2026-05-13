<script setup lang="ts">
import { computed, ref } from 'vue'

import ChapterTabs from '@/components/chapter/ChapterTabs.vue'
import ChapterEditor from '@/components/chapter/ChapterEditor.vue'
import SceneEditor from '@/components/chapter/SceneEditor.vue'
import ParticipantPicker from '@/components/chapter/ParticipantPicker.vue'
import SaveAsBranchDialog from '@/components/chapter/SaveAsBranchDialog.vue'
import ChapterBranchList from '@/components/chapter/ChapterBranchList.vue'
import { useWorkspaceStore } from '@/stores/workspace'

import type { Chapter, ChapterBranch, Scene } from '@/types/chapter'
import type { Character } from '@/types/character'

const props = defineProps<{
  chapters: Chapter[]
  characters: Character[]
  branchesByChapter: Record<string, ChapterBranch[]>
}>()

const emit = defineEmits<{
  saveChapter: [chapter: Chapter]
  saveBranch: [chapterId: string, branchName: string]
}>()

const workspace = useWorkspaceStore()
const isBranchDialogOpen = ref(false)

const activeChapter = computed<Chapter | null>(() => {
  const activeId = workspace.chapterTabs.find((t) => t.chapterId)?.chapterId
  if (!activeId) return null
  return props.chapters.find((c) => c.id === activeId) ?? null
})

function openChapter(chapter: Chapter): void {
  workspace.openChapterTab(chapter.id, chapter.title)
}

function onSceneUpdate(scene: Scene): void {
  if (!activeChapter.value) return
  emit('saveChapter', { ...activeChapter.value, scene })
}

function onParticipantUpdate(ids: string[]): void {
  if (!activeChapter.value) return
  emit('saveChapter', { ...activeChapter.value, presentCharacters: ids })
}

function onChapterSave(chapter: Chapter): void {
  emit('saveChapter', chapter)
}

function openBranchDialog(): void {
  isBranchDialogOpen.value = true
}

function onBranchConfirm(branchName: string): void {
  if (!activeChapter.value) return
  emit('saveBranch', activeChapter.value.id, branchName)
  isBranchDialogOpen.value = false
}

defineExpose({ openChapter, openBranchDialog })
</script>

<template>
  <section data-testid="chapter-view">
    <ChapterTabs
      :tabs="workspace.chapterTabs"
      :active-chapter-id="activeChapter?.id ?? null"
      @open="(id: string, title: string) => workspace.openChapterTab(id, title)"
      @activate="(id: string) => workspace.openChapterTab(id, id)"
      @close="(id: string) => workspace.closeChapterTab(id)"
    />
    <div v-if="activeChapter" class="mt-4 grid grid-cols-2 gap-4">
      <div class="space-y-3">
        <SceneEditor :scene="activeChapter.scene" @update="onSceneUpdate" />
        <ParticipantPicker
          :characters="characters"
          :selected-character-ids="activeChapter.presentCharacters"
          @update="onParticipantUpdate"
        />
        <button
          type="button"
          data-testid="open-branch-dialog"
          class="px-3 py-1 rounded-md bg-slate-200 text-sm"
          @click="openBranchDialog"
        >
          另存為分支
        </button>
        <ChapterBranchList
          :branches="branchesByChapter[activeChapter.id] ?? []"
          @activate="() => undefined"
        />
      </div>
      <div>
        <ChapterEditor :chapter="activeChapter" @save="onChapterSave" />
      </div>
      <SaveAsBranchDialog
        v-if="isBranchDialogOpen"
        :chapter-title="activeChapter.title"
        @confirm="onBranchConfirm"
        @cancel="isBranchDialogOpen = false"
      />
    </div>
    <p v-else data-testid="no-active-chapter" class="text-slate-400 text-sm mt-4">
      尚未開啟任何章節
    </p>
  </section>
</template>
