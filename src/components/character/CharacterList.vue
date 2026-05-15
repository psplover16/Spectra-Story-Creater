<script setup lang="ts">
import { computed } from 'vue'

import type { Character } from '@/types/character'

const props = defineProps<{
  characters: Character[]
  /** null 表示「未選擇陣營」，'__none__' 代表「無陣營」過濾 */
  factionFilter: string | null | '__none__'
}>()

const emit = defineEmits<{
  select: [characterId: string]
}>()

const filtered = computed<Character[]>(() => {
  if (props.factionFilter === null) return props.characters
  if (props.factionFilter === '__none__') {
    return props.characters.filter((c) => c.factionIds.length === 0)
  }
  return props.characters.filter((c) => c.factionIds.includes(props.factionFilter as string))
})
</script>

<template>
  <ul data-testid="character-list" class="space-y-1">
    <li
      v-for="character in filtered"
      :key="character.id"
      :data-testid="`character-${character.name}`"
      class="px-3 py-2 rounded-md bg-slate-50 hover:bg-slate-100 cursor-pointer"
      @click="emit('select', character.id)"
    >
      {{ character.name }}
      <span v-if="character.factionIds.length === 0" class="text-xs text-slate-500 ml-2">無陣營</span>
    </li>
    <li v-if="filtered.length === 0" data-testid="character-empty" class="text-slate-400 text-sm">
      無符合條件的角色
    </li>
  </ul>
</template>
