<script setup lang="ts">
import { reactive } from 'vue'

import type { DriftAction } from '@/types/character'

interface Filter {
  fromTime: string
  toTime: string
  actions: DriftAction[]
  characterId: string
}

const emit = defineEmits<{
  update: [filter: Partial<Filter>]
}>()

const state = reactive<Filter>({
  fromTime: '',
  toTime: '',
  actions: [],
  characterId: '',
})

function emitNow(): void {
  emit('update', { ...state })
}
</script>

<template>
  <section data-testid="drift-filters" class="flex flex-wrap gap-2 items-end">
    <label>
      <span class="text-xs text-slate-600">開始</span>
      <input
        v-model="state.fromTime"
        data-testid="filter-from"
        type="text"
        class="rounded-md border-slate-300 text-sm"
        @input="emitNow"
      />
    </label>
    <label>
      <span class="text-xs text-slate-600">結束</span>
      <input
        v-model="state.toTime"
        data-testid="filter-to"
        type="text"
        class="rounded-md border-slate-300 text-sm"
        @input="emitNow"
      />
    </label>
    <label>
      <span class="text-xs text-slate-600">角色</span>
      <input
        v-model="state.characterId"
        data-testid="filter-character"
        type="text"
        class="rounded-md border-slate-300 text-sm"
        @input="emitNow"
      />
    </label>
  </section>
</template>
