<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import FactionEditor from '@/components/faction/FactionEditor.vue'
import FactionList from '@/components/faction/FactionList.vue'
import FactionMembersView from '@/components/faction/FactionMembersView.vue'
import { toPlain } from '@/services/ipc/toPlain'
import type { Character } from '@/types/character'
import type { Faction, FactionAlignment } from '@/types/faction'

const props = defineProps<{
  novelDir: string
}>()

const factions = ref<Faction[]>([])
const characters = ref<Character[]>([])
const activeFactionId = ref<string | null>(null)
const showMembers = ref(false)

const activeFaction = computed<Faction | null>(() => {
  if (activeFactionId.value === null) return null
  return factions.value.find((f) => f.id === activeFactionId.value) ?? null
})

async function reload(): Promise<void> {
  const list = (await window.api.faction.list(props.novelDir)) as Faction[]
  factions.value = Array.isArray(list) ? list : []
  if (typeof window.api.character?.list === 'function') {
    const chars = (await window.api.character.list(props.novelDir)) as Character[]
    characters.value = Array.isArray(chars) ? chars : []
  }
}

onMounted(() => {
  void reload()
})

function selectFaction(factionId: string): void {
  activeFactionId.value = factionId
  showMembers.value = false
}

function toggleMembers(): void {
  showMembers.value = !showMembers.value
}

async function handleSave(
  draft: Partial<Faction> & { name: string; alignment: FactionAlignment },
): Promise<void> {
  const now = new Date().toISOString()
  const base: Faction =
    activeFaction.value !== null
      ? { ...activeFaction.value }
      : {
          id: draft.id ?? `f-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          name: '',
          alignment: 'neutral',
          description: '',
          currentSituation: '',
          keyMembers: [],
          createdAt: now,
          updatedAt: now,
        }
  const payload: Faction = {
    ...base,
    name: draft.name,
    alignment: draft.alignment,
    description: draft.description ?? base.description,
    currentSituation: draft.currentSituation ?? base.currentSituation,
    updatedAt: now,
  }
  await window.api.faction.write(props.novelDir, toPlain(payload))
  await reload()
}

async function handleDelete(): Promise<void> {
  if (activeFactionId.value === null) return
  await window.api.faction.delete(props.novelDir, activeFactionId.value)
  activeFactionId.value = null
  showMembers.value = false
  await reload()
}

async function handleAddMember(characterId: string): Promise<void> {
  if (activeFactionId.value === null) return
  const character = characters.value.find((c) => c.id === characterId)
  if (!character) return
  if (character.factionIds.includes(activeFactionId.value)) return
  const updated: Character = {
    ...character,
    factionIds: [...character.factionIds, activeFactionId.value],
  }
  await window.api.character.write(props.novelDir, toPlain(updated))
  await reload()
}

async function handleRemoveMember(characterId: string): Promise<void> {
  if (activeFactionId.value === null) return
  const character = characters.value.find((c) => c.id === characterId)
  if (!character) return
  if (!character.factionIds.includes(activeFactionId.value)) return
  const updated: Character = {
    ...character,
    factionIds: character.factionIds.filter((id) => id !== activeFactionId.value),
  }
  await window.api.character.write(props.novelDir, toPlain(updated))
  await reload()
}

function openCreate(): void {
  activeFactionId.value = null
  showMembers.value = false
}
</script>

<template>
  <section data-testid="factions-tab" class="p-4 space-y-4">
    <div class="flex items-center justify-between">
      <h3 class="text-sm font-medium">陣營列表</h3>
      <button
        type="button"
        data-testid="faction-create"
        class="px-3 py-1 rounded-md bg-slate-800 text-white text-sm"
        @click="openCreate"
      >
        新增陣營
      </button>
    </div>
    <FactionList :factions="factions" :active-faction-id="activeFactionId" @select="selectFaction" />
    <div class="space-y-2">
      <div class="flex items-center gap-2">
        <button
          v-if="activeFactionId !== null"
          type="button"
          data-testid="faction-toggle-members"
          class="px-3 py-1 rounded-md bg-slate-100 text-sm"
          @click="toggleMembers"
        >
          {{ showMembers ? '回到編輯器' : '查看成員' }}
        </button>
        <button
          v-if="activeFactionId !== null"
          type="button"
          data-testid="faction-delete"
          class="px-3 py-1 rounded-md bg-red-600 text-white text-sm"
          @click="handleDelete"
        >
          刪除陣營
        </button>
      </div>
      <FactionMembersView
        v-if="showMembers && activeFactionId !== null"
        :faction-id="activeFactionId"
        :characters="characters"
        @add-member="handleAddMember"
        @remove-member="handleRemoveMember"
      />
      <FactionEditor v-else :faction="activeFaction" @save="handleSave" />
    </div>
  </section>
</template>
