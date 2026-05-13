<script setup lang="ts">
import { onMounted, ref } from 'vue'

import CharacterEditor from '@/components/character/CharacterEditor.vue'
import CharacterList from '@/components/character/CharacterList.vue'
import type { Character } from '@/types/character'

const props = defineProps<{
  novelId: string
}>()

const characters = ref<Character[]>([])
const selected = ref<Character | null>(null)
const editorOpen = ref(false)

async function reload(): Promise<void> {
  const list = (await window.api.character.list(props.novelId)) as Character[]
  characters.value = Array.isArray(list) ? list : []
}

onMounted(() => {
  void reload()
})

function openCreate(): void {
  selected.value = null
  editorOpen.value = true
}

async function openExisting(characterId: string): Promise<void> {
  const found = characters.value.find((c) => c.id === characterId) ?? null
  if (found !== null) {
    selected.value = found
    editorOpen.value = true
    return
  }
  const fetched = (await window.api.character.read(
    props.novelId,
    characterId,
  )) as Character | null
  selected.value = fetched
  editorOpen.value = true
}

async function handleSave(draft: {
  id?: string
  name: string
  personality: string
  appearance: string
}): Promise<void> {
  const now = new Date().toISOString()
  const base: Character =
    selected.value !== null
      ? { ...selected.value }
      : {
          id: draft.id ?? `c-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          name: '',
          personality: '',
          abilities: [],
          appearance: '',
          factionId: null,
          socialStatus: '',
          relationships: [],
          notes: '',
          createdAt: now,
          updatedAt: now,
        }
  const payload: Character = {
    ...base,
    name: draft.name,
    personality: draft.personality,
    appearance: draft.appearance,
    updatedAt: now,
  }
  await window.api.character.write(props.novelId, payload)
  editorOpen.value = false
  selected.value = null
  await reload()
}

async function handleDelete(): Promise<void> {
  if (selected.value === null) return
  await window.api.character.delete(props.novelId, selected.value.id)
  editorOpen.value = false
  selected.value = null
  await reload()
}
</script>

<template>
  <section data-testid="characters-tab" class="p-4 space-y-4">
    <div class="flex items-center justify-between">
      <h3 class="text-sm font-medium">角色列表</h3>
      <button
        type="button"
        data-testid="character-create"
        class="px-3 py-1 rounded-md bg-slate-800 text-white text-sm"
        @click="openCreate"
      >
        新增角色
      </button>
    </div>
    <CharacterList
      :characters="characters"
      :faction-filter="null"
      @select="openExisting"
    />
    <div v-if="editorOpen" data-testid="character-editor-panel" class="space-y-2">
      <CharacterEditor :character="selected" @save="handleSave" />
      <button
        v-if="selected !== null"
        type="button"
        data-testid="character-delete"
        class="px-3 py-1 rounded-md bg-red-600 text-white text-sm"
        @click="handleDelete"
      >
        刪除角色
      </button>
    </div>
  </section>
</template>
