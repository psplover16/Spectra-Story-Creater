<script setup lang="ts">
import type { Character } from '@/types/character'

const props = defineProps<{
  characters: Character[]
  selectedCharacterIds: string[]
}>()

const emit = defineEmits<{
  update: [ids: string[]]
}>()

function toggle(id: string): void {
  if (props.selectedCharacterIds.includes(id)) {
    emit(
      'update',
      props.selectedCharacterIds.filter((x) => x !== id),
    )
  } else {
    emit('update', [...props.selectedCharacterIds, id])
  }
}
</script>

<template>
  <ul data-testid="participant-picker" class="space-y-1">
    <li
      v-for="c in characters"
      :key="c.id"
      :data-testid="`participant-${c.id}`"
      class="flex items-center gap-2"
    >
      <input
        type="checkbox"
        :checked="selectedCharacterIds.includes(c.id)"
        :data-testid="`participant-check-${c.id}`"
        @change="toggle(c.id)"
      />
      <span>{{ c.name }}</span>
    </li>
  </ul>
</template>
