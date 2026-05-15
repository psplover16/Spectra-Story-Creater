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
import EquipmentTab from '@/components/tabs/EquipmentTab.vue'
import SettingsTab from '@/components/tabs/SettingsTab.vue'
import CollaborationModeGate from '@/components/tabs/CollaborationModeGate.vue'
import CliFallbackDialog from '@/components/ai/CliFallbackDialog.vue'

import { useWorkspaceStore } from '@/stores/workspace'
import { useAiSettingsStore } from '@/stores/aiSettings'
import { useSuggestionFlow } from '@/composables/useSuggestionFlow'
import { bootstrapAdapters } from '@/services/bootstrap/adapterBootstrap'
import { auditorDryRun } from '@/services/consistency/auditor'

import type { Novel } from '@/types/novel'
import type { Chapter, ChapterBranch } from '@/types/chapter'
import type { Character } from '@/types/character'
import type { CollaborationMode } from '@/types/collaboration'
import type { EquipmentItem } from '@/types/equipment'
import type { ExportFormat } from '@/services/export/branchExport'
import { toPlain } from '@/services/ipc/toPlain'

const workspace = useWorkspaceStore()
const aiSettings = useAiSettingsStore()
const novels = ref<Novel[]>([])
const isLoadingNovels = ref(false)
const createDialogOpen = ref(false)
const newNovelName = ref('')
const newNovelStyle = ref('')

const chapters = ref<Chapter[]>([])
const characters = ref<Character[]>([])
const branchesByChapter = ref<Record<string, ChapterBranch[]>>({})

const activeNovelDir = computed<string | null>(() => {
  if (workspace.workspaceRoot === null || workspace.activeNovelName === null) return null
  const root = workspace.workspaceRoot.replace(/[\\/]+$/, '')
  return `${root}/${workspace.activeNovelName}`
})

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
  if (activeNovelDir.value === null) {
    chapters.value = []
    characters.value = []
    return
  }
  const dir = activeNovelDir.value
  const [chs, chars] = await Promise.all([
    window.api.chapter.list(dir) as Promise<Chapter[]>,
    window.api.character.list(dir) as Promise<Character[]>,
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

async function onOpenChapter(chapterId: string): Promise<void> {
  let chapter = chapters.value.find((c) => c.id === chapterId)
  if (!chapter) {
    await refreshNovelData()
    chapter = chapters.value.find((c) => c.id === chapterId)
  }
  if (chapter) workspace.openChapterTab(chapter.id, chapter.title)
}

async function onSaveChapter(chapter: Chapter): Promise<void> {
  if (activeNovelDir.value === null) return
  await window.api.chapter.write(activeNovelDir.value, toPlain(chapter))
  await refreshNovelData()
}

async function onSaveBranch(chapterId: string, branchName: string): Promise<void> {
  if (activeNovelDir.value === null) return
  const chapter = chapters.value.find((c) => c.id === chapterId)
  if (!chapter) return
  await window.api.chapter.branch.save(
    activeNovelDir.value,
    chapterId,
    branchName,
    toPlain(chapter),
  )
  const list = (await window.api.chapter.branch.list(
    activeNovelDir.value,
    chapterId,
  )) as ChapterBranch[]
  branchesByChapter.value = { ...branchesByChapter.value, [chapterId]: list }
}

async function onExportChapter(args: {
  chapterId: string
  format: ExportFormat
  branchId: string | null
}): Promise<void> {
  if (activeNovelDir.value === null) return
  await window.api.export.chapter(activeNovelDir.value, args.chapterId, args.format)
}

const flow = useSuggestionFlow({
  novelDir: activeNovelDir,
  adapters: {
    codex: { source: 'codex', invoke: (input) => window.api.ai.invoke('codex', toPlain(input)) },
    claude: { source: 'claude', invoke: (input) => window.api.ai.invoke('claude', toPlain(input)) },
  },
  aiSettings,
  loadNovel: (dir: string) => window.api.novel.read(dir) as Promise<Novel | null>,
  loadCharacters: (dir: string) => window.api.character.list(dir) as Promise<Character[]>,
  loadChapters: (dir: string) => window.api.chapter.list(dir) as Promise<Chapter[]>,
  loadEquipment: (dir: string) =>
    (window.api.equipment?.list(dir) ?? Promise.resolve([])) as Promise<EquipmentItem[]>,
  runAuditor: (candidate, context) => {
    const chapterId = context.chapterOutline.chapterId
    const ch = chapters.value.find((c) => c.id === chapterId)
    const presentCharIds = new Set(ch?.presentCharacters ?? [])
    const presentChars = characters.value.filter((c) => presentCharIds.has(c.id))
    return auditorDryRun({
      candidateResponse: candidate,
      chapterId,
      chapterIndex: ch?.index ?? 0,
      presentCharacters: presentChars,
      worldview: activeNovel.value?.worldview ?? [],
      deceasedCharacterIds: [],
      context,
      mutes: [],
    })
  },
})

async function onRequestSuggestion(chapterId: string): Promise<void> {
  await flow.requestSuggestion(chapterId)
}

function onCliFallbackRetry(): void {
  flow.cliFallbackPrompt.value?.resolve('retry')
}

function onCliFallbackSwitch(): void {
  flow.cliFallbackPrompt.value?.resolve('switch')
}

function onCliFallbackCancel(): void {
  flow.cliFallbackPrompt.value?.resolve('cancel')
}

watch(
  () => workspace.activeNovelName,
  async () => {
    await refreshNovelData()
  },
)

onMounted(async () => {
  await bootstrapAdapters()
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
      <NovelView v-if="activeNovelDir !== null">
        <template #characters>
          <CharactersTab :novel-dir="activeNovelDir" />
        </template>
        <template #chapters>
          <ChaptersTab
            :novel-dir="activeNovelDir"
            @open-chapter="onOpenChapter"
            @focus-chapter="onOpenChapter"
          />
          <ChapterView
            v-if="workspace.chapterTabs.length > 0"
            class="mt-4"
            :chapters="chapters"
            :characters="characters"
            :branches-by-chapter="branchesByChapter"
            :current-suggestion="flow.currentSuggestion.value"
            :pending-findings="flow.pendingFindings.value"
            :pending-findings-inconclusive="flow.pendingFindingsInconclusive.value"
            :is-loading="flow.isLoading.value"
            @save-chapter="onSaveChapter"
            @save-branch="onSaveBranch"
            @request-suggestion="onRequestSuggestion"
            @export-chapter="onExportChapter"
          />
        </template>
        <template #factions>
          <FactionsTab :novel-dir="activeNovelDir" />
        </template>
        <template #worldview>
          <WorldviewTab :novel-dir="activeNovelDir" />
        </template>
        <template #equipment>
          <EquipmentTab :novel-dir="activeNovelDir" />
        </template>
        <template #settings>
          <SettingsTab :novel-dir="activeNovelDir" :novel-id="activeNovelId ?? ''" />
        </template>
      </NovelView>
    </div>

    <div
      v-if="flow.cliFallbackPrompt.value !== null"
      data-testid="cli-fallback-overlay"
      class="fixed inset-0 bg-black/30 flex items-center justify-center p-4"
    >
      <div class="max-w-md w-full">
        <CliFallbackDialog
          :failed-source="flow.cliFallbackPrompt.value.failedSource"
          error-message="無法呼叫 CLI；請選擇重試、改用另一個來源、或取消本次建議。"
          @retry="onCliFallbackRetry"
          @switch="onCliFallbackSwitch"
          @cancel="onCliFallbackCancel"
        />
      </div>
    </div>
  </main>
</template>
