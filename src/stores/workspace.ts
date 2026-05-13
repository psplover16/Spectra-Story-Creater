import { defineStore } from 'pinia'

import type { CollaborationMode } from '@/types/collaboration'

export interface ChapterTabState {
  chapterId: string
  title: string
  isDirty: boolean
}

export interface RequestSwitchResult {
  requiresConfirmation: boolean
  hasUnsaved: boolean
}

interface WorkspaceState {
  workspaceRoot: string | null
  activeNovelName: string | null
  chapterTabs: ChapterTabState[]
  collaborationMode: CollaborationMode | null
}

export const useWorkspaceStore = defineStore('workspace', {
  state: (): WorkspaceState => ({
    workspaceRoot: null,
    activeNovelName: null,
    chapterTabs: [],
    collaborationMode: null,
  }),
  getters: {
    hasUnsavedTabs: (state) => state.chapterTabs.some((t) => t.isDirty),
  },
  actions: {
    setWorkspaceRoot(root: string | null): void {
      this.workspaceRoot = root
    },
    setActiveNovel(name: string | null): void {
      this.activeNovelName = name
      this.chapterTabs = []
    },
    setCollaborationMode(mode: CollaborationMode | null): void {
      this.collaborationMode = mode
    },
    hydrate(snapshot: {
      workspaceRoot?: string | null
      activeNovelName?: string | null
      collaborationMode?: CollaborationMode | null
    }): void {
      if (snapshot.workspaceRoot !== undefined) this.workspaceRoot = snapshot.workspaceRoot
      if (snapshot.activeNovelName !== undefined) this.activeNovelName = snapshot.activeNovelName
      if (snapshot.collaborationMode !== undefined) {
        this.collaborationMode = snapshot.collaborationMode
      }
    },
    openChapterTab(chapterId: string, title: string): void {
      const existing = this.chapterTabs.find((t) => t.chapterId === chapterId)
      if (existing) return
      this.chapterTabs.push({ chapterId, title, isDirty: false })
    },
    closeChapterTab(chapterId: string): void {
      this.chapterTabs = this.chapterTabs.filter((t) => t.chapterId !== chapterId)
    },
    markTabDirty(chapterId: string, dirty: boolean): void {
      const tab = this.chapterTabs.find((t) => t.chapterId === chapterId)
      if (tab) tab.isDirty = dirty
    },
    requestSwitchNovel(nextName: string): RequestSwitchResult {
      if (this.activeNovelName === null || this.activeNovelName === nextName) {
        return { requiresConfirmation: false, hasUnsaved: false }
      }
      const hasUnsaved = this.hasUnsavedTabs
      return { requiresConfirmation: true, hasUnsaved }
    },
    confirmSwitchNovel(nextName: string): void {
      this.setActiveNovel(nextName)
    },
  },
})
