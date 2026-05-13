<script setup lang="ts">
import { ref } from 'vue'

import type { ExportFormat } from '@/services/export/branchExport'
import type { ChapterBranch } from '@/types/chapter'

const props = defineProps<{
  branches: ChapterBranch[]
  hasUnsavedChanges?: boolean
}>()

const emit = defineEmits<{
  confirm: [args: { format: ExportFormat; branchId: string | null }]
  cancel: []
  saveBeforeExport: []
}>()

const format = ref<ExportFormat>('epub-like')
const branchId = ref<string | null>(null)
const promptUnsaved = ref(props.hasUnsavedChanges ?? false)

function confirm(): void {
  if (promptUnsaved.value) {
    emit('saveBeforeExport')
    return
  }
  emit('confirm', { format: format.value, branchId: branchId.value })
}
</script>

<template>
  <div data-testid="export-dialog" class="p-4 bg-white rounded-md border border-slate-200">
    <h3 class="text-base font-semibold mb-2">匯出章節 HTML</h3>
    <fieldset class="space-y-2">
      <legend class="text-sm">格式</legend>
      <label class="block">
        <input v-model="format" data-testid="export-format-epub" type="radio" value="epub-like" />
        epub-like（單檔內嵌 CSS）
      </label>
      <label class="block">
        <input v-model="format" data-testid="export-format-web" type="radio" value="web-page" />
        web-page（含側欄章節導覽）
      </label>
    </fieldset>
    <fieldset v-if="branches.length > 0" class="mt-2">
      <legend class="text-sm">分支</legend>
      <label class="block">
        <input v-model="branchId" data-testid="export-branch-main" type="radio" :value="null" />
        主章節
      </label>
      <label v-for="branch in branches" :key="branch.id" class="block">
        <input
          v-model="branchId"
          :data-testid="`export-branch-${branch.id}`"
          type="radio"
          :value="branch.id"
        />
        {{ branch.branchName }}
      </label>
    </fieldset>
    <p v-if="promptUnsaved" data-testid="export-unsaved" class="text-xs text-amber-700 mt-2">
      章節有未儲存編輯，請先儲存後再匯出。
    </p>
    <div class="flex gap-2 mt-3">
      <button
        type="button"
        data-testid="export-confirm"
        class="px-3 py-1 rounded-md bg-slate-800 text-white text-sm"
        @click="confirm"
      >
        {{ promptUnsaved ? '先儲存' : '匯出' }}
      </button>
      <button
        type="button"
        data-testid="export-cancel"
        class="px-3 py-1 rounded-md bg-slate-200 text-sm"
        @click="emit('cancel')"
      >
        取消
      </button>
    </div>
  </div>
</template>
