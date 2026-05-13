<script setup lang="ts">
import type { Faction } from '@/types/faction'

defineProps<{
  factions: Faction[]
  activeFactionId: string | null
}>()

const emit = defineEmits<{
  select: [factionId: string]
}>()
</script>

<template>
  <ul data-testid="faction-list" class="space-y-1">
    <li
      v-for="faction in factions"
      :key="faction.id"
      :data-testid="`faction-${faction.id}`"
      :class="[
        'px-3 py-2 rounded-md cursor-pointer',
        activeFactionId === faction.id ? 'bg-slate-200' : 'bg-slate-50 hover:bg-slate-100',
      ]"
      @click="emit('select', faction.id)"
    >
      {{ faction.name }}
      <span class="text-xs text-slate-500 ml-2">{{ faction.alignment }}</span>
    </li>
    <li v-if="factions.length === 0" data-testid="faction-empty" class="text-slate-400 text-sm">
      此小說尚未建立任何陣營
    </li>
  </ul>
</template>
