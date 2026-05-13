<script setup lang="ts">
import { reactive, watch } from 'vue'

import type { Faction, FactionAlignment } from '@/types/faction'

const props = defineProps<{
  faction?: Faction | null
}>()

const emit = defineEmits<{
  save: [draft: Partial<Faction> & { name: string; alignment: FactionAlignment }]
}>()

interface Draft {
  id: string | undefined
  name: string
  alignment: FactionAlignment
  description: string
  currentSituation: string
}

const draft = reactive<Draft>({
  id: props.faction?.id,
  name: props.faction?.name ?? '',
  alignment: props.faction?.alignment ?? 'neutral',
  description: props.faction?.description ?? '',
  currentSituation: props.faction?.currentSituation ?? '',
})

watch(
  () => props.faction,
  (next) => {
    draft.id = next?.id
    draft.name = next?.name ?? ''
    draft.alignment = next?.alignment ?? 'neutral'
    draft.description = next?.description ?? ''
    draft.currentSituation = next?.currentSituation ?? ''
  },
)

function save(): void {
  if (draft.name.trim() === '') return
  emit('save', { ...draft })
}
</script>

<template>
  <form data-testid="faction-editor" @submit.prevent="save">
    <label class="block mb-2">
      <span class="text-xs text-slate-600">名稱</span>
      <input
        v-model="draft.name"
        data-testid="faction-name"
        type="text"
        class="block w-full rounded-md border-slate-300"
      />
    </label>
    <label class="block mb-2">
      <span class="text-xs text-slate-600">立場</span>
      <select
        v-model="draft.alignment"
        data-testid="faction-alignment"
        class="block w-full rounded-md border-slate-300"
      >
        <option value="protagonist">正派</option>
        <option value="antagonist">反派</option>
        <option value="neutral">中立</option>
      </select>
    </label>
    <label class="block mb-2">
      <span class="text-xs text-slate-600">描述</span>
      <textarea
        v-model="draft.description"
        data-testid="faction-description"
        class="block w-full rounded-md border-slate-300"
      />
    </label>
    <label class="block mb-2">
      <span class="text-xs text-slate-600">當前狀況</span>
      <textarea
        v-model="draft.currentSituation"
        data-testid="faction-situation"
        class="block w-full rounded-md border-slate-300"
      />
    </label>
    <button
      type="submit"
      data-testid="faction-save"
      class="px-3 py-1 rounded-md bg-slate-800 text-white"
    >
      儲存
    </button>
  </form>
</template>
