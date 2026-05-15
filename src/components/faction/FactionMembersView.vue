<script setup lang="ts">
import { computed, ref } from 'vue'

import type { Character } from '@/types/character'

const props = defineProps<{
  factionId: string
  characters: Character[]
}>()

const emit = defineEmits<{
  'add-member': [characterId: string]
  'remove-member': [characterId: string]
}>()

const members = computed(() =>
  props.characters.filter((c) => c.factionIds.includes(props.factionId)),
)

const candidates = computed(() =>
  props.characters.filter((c) => !c.factionIds.includes(props.factionId)),
)

const selectedCharacterId = ref<string>('')

function handleAdd(): void {
  if (selectedCharacterId.value === '') return
  emit('add-member', selectedCharacterId.value)
  selectedCharacterId.value = ''
}

function handleRemove(characterId: string): void {
  emit('remove-member', characterId)
}
</script>

<template>
  <section data-testid="faction-members">
    <h4 class="text-sm font-medium mb-2">成員（{{ members.length }}）</h4>
    <ul class="space-y-1">
      <li
        v-for="member in members"
        :key="member.id"
        :data-testid="`member-${member.name}`"
        class="px-3 py-1 rounded-md bg-slate-50 flex items-center justify-between"
      >
        <span>{{ member.name }}</span>
        <button
          type="button"
          :data-testid="`remove-member-${member.id}`"
          class="text-xs text-red-600"
          @click="handleRemove(member.id)"
        >
          移除
        </button>
      </li>
      <li v-if="members.length === 0" data-testid="member-empty" class="text-slate-400 text-sm">
        此陣營暫無成員
      </li>
    </ul>

    <div
      v-if="candidates.length > 0"
      class="mt-3 flex items-center gap-2"
      data-testid="add-member-row"
    >
      <select
        v-model="selectedCharacterId"
        data-testid="add-member-select"
        class="rounded-md border-slate-300 text-sm"
      >
        <option value="">選擇要加入的角色…</option>
        <option v-for="c in candidates" :key="c.id" :value="c.id">{{ c.name }}</option>
      </select>
      <button
        type="button"
        data-testid="add-member-button"
        :disabled="selectedCharacterId === ''"
        class="px-3 py-1 rounded-md bg-slate-800 text-white text-sm disabled:bg-slate-300"
        @click="handleAdd"
      >
        加入
      </button>
    </div>
  </section>
</template>
