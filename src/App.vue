<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'

import WorkspaceSelectView from '@/views/WorkspaceSelectView.vue'
import HomeView from '@/views/HomeView.vue'
import NovelView from '@/views/NovelView.vue'
import ChapterView from '@/views/ChapterView.vue'

import CharactersTab from '@/components/tabs/CharactersTab.vue'
import ChaptersTab from '@/components/tabs/ChaptersTab.vue'
import FactionsTab from '@/components/tabs/FactionsTab.vue'
import WorldviewTab from '@/components/tabs/WorldviewTab.vue'
import SettingsTab from '@/components/tabs/SettingsTab.vue'
import CollaborationModeGate from '@/components/tabs/CollaborationModeGate.vue'

import { useWorkspaceStore } from '@/stores/workspace'

import type { Novel } from '@/types/novel'
import type { Chapter, ChapterBranch } from '@/types/chapter'
import type { Character } from '@/types/character'
import type { CollaborationMode } from '@/types/collaboration'
import type { ExportFormat } from '@/services/export/branchExport'

const workspace = useWorkspaceStore()
const novels = ref<Novel[]>([])
const isLoadingNovels = ref(false)
const createDialogOpen = ref(false)
const newNovelName = ref('')
const newNovelStyle = ref('')

const chapters = ref<Chapter[]>([])
const characters = ref<Character[]>([])
const branchesByChapter = ref<Record<string, ChapterBranch[]>>({})

const activeNovel = computed<Novel | null>(() => {
  if (workspace.activeNovelName === null) return null
  return novels.value.find((n) => n.name === workspace.activeNovelName) ?? null
})

const activeNovelId = computed<string | null>(() => activeNovel.value?.id ?? null)

async function pickFolder(): Promise<string | null> {
  return window.api.workspace.pickFolder()
}

async function isWritable(path: string): Promise<boolean> {
  return window.api.workspace.isWritable(path)
}

async function refreshNovels(): Promise<void> {
  if (workspace.workspaceRoot === null) return
  isLoadingNovels.value = true
  try {
    novels.value = (await window.api.workspace.list(workspace.workspaceRoot)) as Novel[]
  } finally {
    isLoadingNovels.value = false
  }
}

async function refreshNovelData(): Promise<void> {
  if (activeNovelId.value === null) {
    chapters.value = []
    characters.value = []
    return
  }
  const id = activeNovelId.value
  const [chs, chars] = await Promise.all([
    window.api.chapter.list(id) as Promise<Chapter[]>,
    window.api.character.list(id) as Promise<Character[]>,
  ])
  chapters.value = chs
  characters.value = chars
}

async function onModeSelected(mode: CollaborationMode): Promise<void> {
  workspace.setCollaborationMode(mode)
}

async function onWorkspaceSelected(path: string): Promise<void> {
  workspace.setWorkspaceRoot(path)
  await refreshNovels()
}

async function onOpenNovel(name: string): Promise<void> {
  workspace.setActiveNovel(name)
  await refreshNovelData()
}

async function onCreateNovel(): Promise<void> {
  if (workspace.workspaceRoot === null) return
  if (newNovelName.value.trim() === '') return
  await window.api.workspace.create(workspace.workspaceRoot, {
    name: newNovelName.value,
    style: newNovelStyle.value,
  })
  createDialogOpen.value = false
  newNovelName.value = ''
  newNovelStyle.value = ''
  await refreshNovels()
}

function backToHome(): void {
  workspace.setActiveNovel(null)
  chapters.value = []
  characters.value = []
}

function onOpenChapter(chapterId: string): void {
  const chapter = chapters.value.find((c) => c.id === chapterId)
  if (chapter) workspace.openChapterTab(chapter.id, chapter.title)
}

async function onSaveChapter(chapter: Chapter): Promise<void> {
  if (activeNovelId.value === null) return
  await window.api.chapter.write(activeNovelId.value, chapter)
  await refreshNovelData()
}

async function onSaveBranch(chapterId: string, branchName: string): Promise<void> {
  if (activeNovelId.value === null) return
  const chapter = chapters.value.find((c) => c.id === chapterId)
  if (!chapter) return
  await window.api.chapter.branch.save(activeNovelId.value, chapterId, branchName, chapter)
  const list = (await window.api.chapter.branch.list(
    activeNovelId.value,
    chapterId,
  )) as ChapterBranch[]
  branchesByChapter.value = { ...branchesByChapter.value, [chapterId]: list }
}

async function onExportChapter(args: {
  chapterId: string
  format: ExportFormat
  branchId: string | null
}): Promise<void> {
  if (activeNovelId.value === null) return
  await window.api.export.chapter(activeNovelId.value, args.chapterId, args.format)
}

function onRequestSuggestion(_chapterId: string): void {
  // The actual call goes through useSuggestionRequest which is wired at mount
  // by adapter bootstrap (Task 4.1). This handler is the renderer-side entry point.
}

watch(
  () => workspace.activeNovelName,
  async () => {
    await refreshNovelData()
  },
)

onMounted(async () => {
  if (workspace.workspaceRoot !== null) {
    await refreshNovels()
    if (workspace.activeNovelName !== null) {
      await refreshNovelData()
    }
  }
})
</script>

<template>
  <main class="min-h-screen bg-slate-50 text-slate-800">
    <CollaborationModeGate
      v-if="workspace.collaborationMode === null"
      :workspace-path="workspace.workspaceRoot ?? ''"
      :active-novel-name="workspace.activeNovelName"
      @mode-selected="onModeSelected"
    />

    <WorkspaceSelectView
      v-else-if="workspace.workspaceRoot === null"
      :pick-folder="pickFolder"
      :is-writable="isWritable"
      @selected="onWorkspaceSelected"
    />

    <div v-else-if="workspace.activeNovelName === null">
      <header class="px-8 pt-6 flex items-center justify-between max-w-3xl mx-auto">
        <div>
          <h1 class="text-xl font-semibold">Spectra 小說創作助手</h1>
          <p class="text-xs text-slate-500 mt-1">
            workspace：<code>{{ workspace.workspaceRoot }}</code>
          </p>
        </div>
        <div class="flex gap-2">
          <button
            type="button"
            data-testid="create-novel-open"
            class="px-3 py-1 rounded-md bg-slate-800 text-white text-sm"
            @click="createDialogOpen = true"
          >
            建立新小說
          </button>
          <button
            type="button"
            class="px-3 py-1 rounded-md bg-slate-200 text-sm"
            @click="workspace.setWorkspaceRoot(null)"
          >
            換工作目錄
          </button>
        </div>
      </header>

      <HomeView :novels="novels" @open="onOpenNovel" />

      <div
        v-if="createDialogOpen"
        class="fixed inset-0 bg-black/30 flex items-center justify-center"
      >
        <div class="bg-white rounded-md p-6 max-w-md w-full">
          <h2 class="text-lg font-semibold mb-3">建立新小說</h2>
          <label class="block mb-2">
            <span class="text-xs text-slate-600">名稱</span>
            <input
              v-model="newNovelName"
              data-testid="create-novel-name"
              type="text"
              class="block w-full rounded-md border-slate-300"
            />
          </label>
          <label class="block mb-3">
            <span class="text-xs text-slate-600">風格（選填）</span>
            <input
              v-model="newNovelStyle"
              data-testid="create-novel-style"
              type="text"
              class="block w-full rounded-md border-slate-300"
            />
          </label>
          <div class="flex gap-2 justify-end">
            <button
              type="button"
              class="px-3 py-1 rounded-md bg-slate-200 text-sm"
              @click="createDialogOpen = false"
            >
              取消
            </button>
            <button
              type="button"
              data-testid="create-novel-confirm"
              class="px-3 py-1 rounded-md bg-slate-800 text-white text-sm"
              @click="onCreateNovel"
            >
              建立
            </button>
          </div>
        </div>
      </div>

      <p v-if="isLoadingNovels" class="text-center text-slate-400 text-sm mt-4">載入中…</p>
    </div>

    <div v-else>
      <header class="px-8 pt-6 flex items-center justify-between max-w-5xl mx-auto">
        <div>
          <h1 class="text-xl font-semibold">{{ workspace.activeNovelName }}</h1>
          <p class="text-xs text-slate-500 mt-1">
            workspace：<code>{{ workspace.workspaceRoot }}</code>
          </p>
        </div>
        <button
          type="button"
          class="px-3 py-1 rounded-md bg-slate-200 text-sm"
          @click="backToHome"
        >
          回小說列表
        </button>
      </header>
      <NovelView v-if="activeNovelId !== null">
        <template #characters>
          <CharactersTab :novel-id="activeNovelId" />
        </template>
        <template #chapters>
          <ChaptersTab
            :novel-id="activeNovelId"
            @open-chapter="onOpenChapter"
            @focus-chapter="onOpenChapter"
          />
          <ChapterView
            v-if="workspace.chapterTabs.length > 0"
            class="mt-4"
            :chapters="chapters"
            :characters="characters"
            :branches-by-chapter="branchesByChapter"
            @save-chapter="onSaveChapter"
            @save-branch="onSaveBranch"
            @request-suggestion="onRequestSuggestion"
            @export-chapter="onExportChapter"
          />
        </template>
        <template #factions>
          <FactionsTab :novel-id="activeNovelId" />
        </template>
        <template #worldview>
          <WorldviewTab :novel-id="activeNovelId" />
        </template>
        <template #settings>
          <SettingsTab :novel-id="activeNovelId" />
        </template>
      </NovelView>
    </div>
  </main>
</template>
