<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import WorldviewEditor from '@/components/worldview/WorldviewEditor.vue'
import type { Novel, WorldviewEntry } from '@/types/novel'

const props = defineProps<{
  novelId: string
}>()

const novel = ref<Novel | null>(null)

const entries = computed<WorldviewEntry[]>(() => novel.value?.worldview ?? [])

async function load(): Promise<void> {
  const loaded = (await window.api.novel.read(props.novelId)) as Novel | null
  novel.value = loaded
}

onMounted(() => {
  void load()
})

async function persist(nextEntries: WorldviewEntry[]): Promise<void> {
  if (novel.value === null) return
  const now = new Date().toISOString()
  const payload: Novel = {
    ...novel.value,
    worldview: nextEntries,
    updatedAt: now,
  }
  novel.value = payload
  await window.api.novel.write(props.novelId, payload)
}

async function handleAdd(entry: WorldviewEntry): Promise<void> {
  const next = [...entries.value, entry]
  await persist(next)
}

async function handleUpdate(entry: WorldviewEntry): Promise<void> {
  const next = entries.value.map((e) => (e.id === entry.id ? entry : e))
  await persist(next)
}

async function handleRemove(id: string): Promise<void> {
  const next = entries.value.filter((e) => e.id !== id)
  await persist(next)
}
</script>

<template>
  <section data-testid="worldview-tab" class="p-4 space-y-4">
    <h3 class="text-sm font-medium">世界觀</h3>
    <WorldviewEditor
      v-if="novel !== null"
      :entries="entries"
      @add="handleAdd"
      @update="handleUpdate"
      @remove="handleRemove"
    />
  </section>
</template>
