<script setup lang="ts">
import { ref } from 'vue'

import type { WorldviewEntry } from '@/types/novel'

const props = defineProps<{
  entries: WorldviewEntry[]
}>()

const emit = defineEmits<{
  add: [entry: WorldviewEntry]
  update: [entry: WorldviewEntry]
  remove: [id: string]
}>()

const newTitle = ref('')
const newContent = ref('')

function genId(): string {
  return `wv-${Date.now()}-${Math.floor(Math.random() * 1000)}`
}

function add(): void {
  if (newTitle.value.trim() === '') return
  emit('add', { id: genId(), title: newTitle.value, content: newContent.value })
  newTitle.value = ''
  newContent.value = ''
}

function updateField(entry: WorldviewEntry, field: 'title' | 'content', value: string): void {
  emit('update', { ...entry, [field]: value })
}

defineExpose({ entries: props.entries })
</script>

<template>
  <section data-testid="worldview-editor" class="space-y-3">
    <div class="space-y-1">
      <label class="block">
        <span class="text-xs text-slate-600">標題</span>
        <input
          v-model="newTitle"
          data-testid="worldview-new-title"
          type="text"
          class="block w-full rounded-md border-slate-300"
        />
      </label>
      <label class="block">
        <span class="text-xs text-slate-600">內容</span>
        <textarea
          v-model="newContent"
          data-testid="worldview-new-content"
          class="block w-full rounded-md border-slate-300"
        />
      </label>
      <button
        type="button"
        data-testid="worldview-add"
        class="px-3 py-1 rounded-md bg-slate-800 text-white text-sm"
        @click="add"
      >
        新增條目
      </button>
    </div>
    <ul class="space-y-2">
      <li
        v-for="entry in entries"
        :key="entry.id"
        :data-testid="`worldview-${entry.id}`"
        class="p-3 rounded-md bg-slate-50"
      >
        <input
          :value="entry.title"
          :data-testid="`worldview-title-${entry.id}`"
          class="block w-full bg-transparent border-b border-slate-300"
          @input="updateField(entry, 'title', ($event.target as HTMLInputElement).value)"
        />
        <textarea
          :value="entry.content"
          :data-testid="`worldview-content-${entry.id}`"
          class="block w-full bg-transparent border-b border-slate-300 mt-1"
          @input="updateField(entry, 'content', ($event.target as HTMLTextAreaElement).value)"
        />
        <button
          type="button"
          :data-testid="`worldview-remove-${entry.id}`"
          class="text-xs text-red-600 mt-1"
          @click="emit('remove', entry.id)"
        >
          移除
        </button>
      </li>
    </ul>
  </section>
</template>
