<script setup lang="ts">
import { reactive, watch } from 'vue'

import type { EquipmentItem, EquipmentKind } from '@/types/equipment'

const props = defineProps<{
  item?: EquipmentItem | null
}>()

const emit = defineEmits<{
  save: [item: EquipmentItem]
}>()

const KINDS: EquipmentKind[] = ['wearable', 'consumable', 'misc']

const draft = reactive<EquipmentItem>({
  id: props.item?.id ?? `eq-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
  name: props.item?.name ?? '',
  kind: props.item?.kind ?? 'misc',
  defaultEffect: props.item?.defaultEffect ?? '',
  ...(props.item?.notes !== undefined ? { notes: props.item.notes } : {}),
})

watch(
  () => props.item,
  (next) => {
    draft.id = next?.id ?? `eq-${Date.now()}-${Math.floor(Math.random() * 1000)}`
    draft.name = next?.name ?? ''
    draft.kind = next?.kind ?? 'misc'
    draft.defaultEffect = next?.defaultEffect ?? ''
    if (next?.notes !== undefined) draft.notes = next.notes
    else delete draft.notes
  },
)

function handleSubmit(): void {
  const payload: EquipmentItem = {
    id: draft.id,
    name: draft.name,
    kind: draft.kind,
    defaultEffect: draft.defaultEffect,
  }
  if (draft.notes !== undefined && draft.notes !== '') payload.notes = draft.notes
  emit('save', payload)
}
</script>

<template>
  <form data-testid="equipment-editor" @submit.prevent="handleSubmit">
    <label class="block mb-2">
      <span class="text-sm text-slate-700">名稱</span>
      <input
        v-model="draft.name"
        data-testid="equipment-editor-name"
        type="text"
        class="mt-1 block w-full rounded-md border-slate-300"
      />
    </label>
    <label class="block mb-2">
      <span class="text-sm text-slate-700">類型</span>
      <select
        v-model="draft.kind"
        data-testid="equipment-editor-kind"
        class="mt-1 block w-full rounded-md border-slate-300"
      >
        <option v-for="k in KINDS" :key="k" :value="k">{{ k }}</option>
      </select>
    </label>
    <label class="block mb-2">
      <span class="text-sm text-slate-700">預設效果（defaultEffect）</span>
      <textarea
        v-model="draft.defaultEffect"
        data-testid="equipment-editor-default-effect"
        class="mt-1 block w-full rounded-md border-slate-300"
        rows="3"
      />
    </label>
    <label class="block mb-2">
      <span class="text-sm text-slate-700">備註（notes，選填）</span>
      <textarea
        v-model="draft.notes"
        data-testid="equipment-editor-notes"
        class="mt-1 block w-full rounded-md border-slate-300"
        rows="2"
      />
    </label>
    <button
      type="submit"
      data-testid="equipment-editor-save"
      class="px-3 py-1 rounded-md bg-slate-800 text-white text-sm"
    >
      儲存
    </button>
  </form>
</template>
