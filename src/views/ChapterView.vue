<script setup lang="ts">
import { computed, ref } from 'vue'

import ChapterTabs from '@/components/chapter/ChapterTabs.vue'
import ChapterEditor from '@/components/chapter/ChapterEditor.vue'
import SceneEditor from '@/components/chapter/SceneEditor.vue'
import ParticipantPicker from '@/components/chapter/ParticipantPicker.vue'
import SaveAsBranchDialog from '@/components/chapter/SaveAsBranchDialog.vue'
import ChapterBranchList from '@/components/chapter/ChapterBranchList.vue'
import SuggestionPanel, {
  type SuggestionContent,
} from '@/components/ai/SuggestionPanel.vue'
import ExportDialog from '@/components/chapter/ExportDialog.vue'
import { useWorkspaceStore } from '@/stores/workspace'

import type { ExportFormat } from '@/services/export/branchExport'
import type { AuditResult } from '@/types/audit'
import type { Chapter, ChapterBranch, Scene } from '@/types/chapter'
import type { Character } from '@/types/character'

const props = withDefaults(
  defineProps<{
    chapters: Chapter[]
    characters: Character[]
    branchesByChapter: Record<string, ChapterBranch[]>
    currentSuggestion?: SuggestionContent | null
    isLoading?: boolean
    pendingFindings?: AuditResult | null
    pendingFindingsInconclusive?: boolean
  }>(),
  {
    currentSuggestion: null,
    isLoading: false,
    pendingFindings: null,
    pendingFindingsInconclusive: false,
  },
)

const emit = defineEmits<{
  saveChapter: [chapter: Chapter]
  saveBranch: [chapterId: string, branchName: string]
  requestSuggestion: [chapterId: string]
  exportChapter: [args: { chapterId: string; format: ExportFormat; branchId: string | null }]
}>()

const workspace = useWorkspaceStore()
const isBranchDialogOpen = ref(false)
const isExportDialogOpen = ref(false)
const isSuggestionOpen = ref(false)

const activeChapter = computed<Chapter | null>(() => {
  const activeId = workspace.chapterTabs.find((t) => t.chapterId)?.chapterId
  if (!activeId) return null
  return props.chapters.find((c) => c.id === activeId) ?? null
})

const canShowEntries = computed<boolean>(() => {
  const c = activeChapter.value
  return c !== null && (c.outline ?? '').trim() !== ''
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

function openSuggestion(): void {
  isSuggestionOpen.value = true
}

function onRequestSuggestion(): void {
  if (!activeChapter.value) return
  emit('requestSuggestion', activeChapter.value.id)
}

function openExport(): void {
  isExportDialogOpen.value = true
}

function onExportConfirm(args: { format: ExportFormat; branchId: string | null }): void {
  if (!activeChapter.value) return
  emit('exportChapter', { chapterId: activeChapter.value.id, ...args })
  isExportDialogOpen.value = false
}

defineExpose({ openChapter, openBranchDialog, openSuggestion, openExport })
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
    <div v-if="activeChapter" :key="activeChapter.id" class="mt-4 grid grid-cols-2 gap-4">
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
        <div v-if="canShowEntries" class="flex gap-2 mt-3" data-testid="chapter-entries">
          <button
            v-if="!isSuggestionOpen"
            type="button"
            data-testid="open-suggestion-entry"
            class="px-3 py-1 rounded-md bg-slate-800 text-white text-sm"
            @click="openSuggestion"
          >
            給我建議
          </button>
          <button
            type="button"
            data-testid="open-export-entry"
            class="px-3 py-1 rounded-md bg-slate-200 text-sm"
            @click="openExport"
          >
            匯出 HTML
          </button>
        </div>
        <SuggestionPanel
          v-if="isSuggestionOpen"
          class="mt-3"
          :current="props.currentSuggestion ?? null"
          :is-loading="props.isLoading"
          :pending-findings="props.pendingFindings"
          :pending-findings-inconclusive="props.pendingFindingsInconclusive"
          @request="onRequestSuggestion"
        />
      </div>
      <SaveAsBranchDialog
        v-if="isBranchDialogOpen"
        :chapter-title="activeChapter.title"
        @confirm="onBranchConfirm"
        @cancel="isBranchDialogOpen = false"
      />
      <ExportDialog
        v-if="isExportDialogOpen"
        :branches="branchesByChapter[activeChapter.id] ?? []"
        @confirm="onExportConfirm"
        @cancel="isExportDialogOpen = false"
      />
    </div>
    <p v-else data-testid="no-active-chapter" class="text-slate-400 text-sm mt-4">
      尚未開啟任何章節
    </p>
  </section>
</template>
