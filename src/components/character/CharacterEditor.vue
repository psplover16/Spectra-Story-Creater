<script setup lang="ts">
import { reactive, ref, watch } from 'vue'

import type { Character } from '@/types/character'

const props = defineProps<{
  character?: Character | null
}>()

const emit = defineEmits<{
  save: [draft: { id?: string; name: string; personality: string; appearance: string }]
}>()

const draft = reactive({
  id: props.character?.id ?? undefined,
  name: props.character?.name ?? '',
  personality: props.character?.personality ?? '',
  appearance: props.character?.appearance ?? '',
})

const error = ref<string | null>(null)

watch(
  () => props.character,
  (next) => {
    draft.id = next?.id ?? undefined
    draft.name = next?.name ?? ''
    draft.personality = next?.personality ?? ''
    draft.appearance = next?.appearance ?? ''
    error.value = null
  },
)

function handleSave(): void {
  if (draft.name.trim() === '') {
    error.value = '角色名稱不可為空'
    return
  }
  error.value = null
  emit('save', { ...draft })
}
</script>

<template>
  <form data-testid="character-editor" @submit.prevent="handleSave">
    <label class="block mb-3">
      <span class="text-sm text-slate-700">姓名</span>
      <input
        v-model="draft.name"
        type="text"
        data-testid="character-name"
        class="mt-1 block w-full rounded-md border-slate-300"
      />
    </label>
    <label class="block mb-3">
      <span class="text-sm text-slate-700">性格</span>
      <textarea
        v-model="draft.personality"
        data-testid="character-personality"
        class="mt-1 block w-full rounded-md border-slate-300"
      />
    </label>
    <label class="block mb-3">
      <span class="text-sm text-slate-700">外觀</span>
      <textarea
        v-model="draft.appearance"
        data-testid="character-appearance"
        class="mt-1 block w-full rounded-md border-slate-300"
      />
    </label>
    <p v-if="error" data-testid="character-error" class="text-red-600 text-sm">
      {{ error }}
    </p>
    <button
      type="submit"
      data-testid="character-save"
      class="px-3 py-1 rounded-md bg-slate-800 text-white"
    >
      儲存
    </button>
  </form>
</template>
