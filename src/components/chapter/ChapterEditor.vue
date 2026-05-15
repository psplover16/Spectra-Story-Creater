<script setup lang="ts">
import { computed, reactive } from 'vue'

import type { Chapter } from '@/types/chapter'

const props = defineProps<{
  chapter: Chapter
}>()

const emit = defineEmits<{
  save: [chapter: Chapter]
}>()

// draft 只在 mount 時用 props 初始化；切換章節由父層 :key="chapter.id" 強制 re-mount 處理。
// 不 watch props.chapter，避免「同章節內 props 因為其他副作用（例如勾選在場角色觸發整章 save）
// 而更新 reference」時把使用者尚未儲存的 outline / content 草稿覆蓋掉。
const draft = reactive<Chapter>({ ...props.chapter })

const isContentDisabled = computed(() => draft.outline.trim() === '')

function save(): void {
  emit('save', { ...draft })
}
</script>

<template>
  <form data-testid="chapter-editor" @submit.prevent="save">
    <label class="block mb-3">
      <span class="text-sm text-slate-700">章節大綱</span>
      <textarea
        v-model="draft.outline"
        data-testid="chapter-outline"
        class="mt-1 block w-full rounded-md border-slate-300"
        rows="3"
      />
    </label>
    <label class="block mb-3">
      <span class="text-sm text-slate-700">章節內容</span>
      <textarea
        v-model="draft.content"
        :disabled="isContentDisabled"
        :data-disabled="isContentDisabled"
        data-testid="chapter-content"
        class="mt-1 block w-full rounded-md border-slate-300 disabled:bg-slate-100 disabled:text-slate-400"
        rows="10"
      />
    </label>
    <p v-if="isContentDisabled" class="text-xs text-slate-500" data-testid="content-locked-hint">
      請先儲存非空大綱才能輸入內容
    </p>
    <button
      type="submit"
      data-testid="chapter-save"
      class="px-3 py-1 rounded-md bg-slate-800 text-white"
    >
      儲存
    </button>
  </form>
</template>
