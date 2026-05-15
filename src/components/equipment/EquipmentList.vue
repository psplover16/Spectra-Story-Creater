<script setup lang="ts">
import type { EquipmentItem } from '@/types/equipment'

defineProps<{
  items: EquipmentItem[]
}>()

const emit = defineEmits<{
  select: [equipmentId: string]
}>()
</script>

<template>
  <ul data-testid="equipment-list" class="space-y-1">
    <li
      v-for="item in items"
      :key="item.id"
      :data-testid="`equipment-row-${item.id}`"
      class="px-3 py-2 rounded-md bg-slate-50 hover:bg-slate-100 cursor-pointer flex items-center gap-2"
      @click="emit('select', item.id)"
    >
      <span class="flex-1">{{ item.name }}</span>
      <span class="text-xs text-slate-500">{{ item.kind }}</span>
    </li>
    <li v-if="items.length === 0" class="text-slate-400 text-sm">尚無裝備</li>
  </ul>
</template>
