<script setup lang="ts">
import { computed } from 'vue'

import type { Character } from '@/types/character'

const props = defineProps<{
  factionId: string
  characters: Character[]
}>()

const members = computed(() => props.characters.filter((c) => c.factionId === props.factionId))
</script>

<template>
  <section data-testid="faction-members">
    <h4 class="text-sm font-medium mb-2">成員（{{ members.length }}）</h4>
    <ul class="space-y-1">
      <li
        v-for="member in members"
        :key="member.id"
        :data-testid="`member-${member.name}`"
        class="px-3 py-1 rounded-md bg-slate-50"
      >
        {{ member.name }}
      </li>
      <li v-if="members.length === 0" data-testid="member-empty" class="text-slate-400 text-sm">
        此陣營暫無成員
      </li>
    </ul>
  </section>
</template>
