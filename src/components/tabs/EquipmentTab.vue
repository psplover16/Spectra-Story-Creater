<script setup lang="ts">
import { onMounted, ref } from 'vue'

import EquipmentEditor from '@/components/equipment/EquipmentEditor.vue'
import EquipmentList from '@/components/equipment/EquipmentList.vue'
import { toPlain } from '@/services/ipc/toPlain'
import type { EquipmentItem } from '@/types/equipment'

const props = defineProps<{
  novelDir: string
}>()

const items = ref<EquipmentItem[]>([])
const selected = ref<EquipmentItem | null>(null)
const editorOpen = ref(false)

async function reload(): Promise<void> {
  const list = (await window.api.equipment.list(props.novelDir)) as EquipmentItem[]
  items.value = Array.isArray(list) ? list : []
}

onMounted(() => {
  void reload()
})

function openCreate(): void {
  selected.value = null
  editorOpen.value = true
}

function openExisting(equipmentId: string): void {
  const found = items.value.find((i) => i.id === equipmentId) ?? null
  selected.value = found
  editorOpen.value = true
}

async function handleSave(item: EquipmentItem): Promise<void> {
  await window.api.equipment.write(props.novelDir, toPlain(item))
  editorOpen.value = false
  selected.value = null
  await reload()
}

async function handleDelete(equipmentId: string): Promise<void> {
  await window.api.equipment.delete(props.novelDir, equipmentId)
  if (selected.value?.id === equipmentId) {
    selected.value = null
    editorOpen.value = false
  }
  await reload()
}
</script>

<template>
  <section data-testid="equipment-tab" class="p-4 space-y-4">
    <div class="flex items-center justify-between">
      <h3 class="text-sm font-medium">裝備庫</h3>
      <button
        type="button"
        data-testid="equipment-tab-add"
        class="px-3 py-1 rounded-md bg-slate-800 text-white text-sm"
        @click="openCreate"
      >
        新增裝備
      </button>
    </div>
    <EquipmentList :items="items" @select="openExisting" />
    <ul v-if="items.length > 0" class="space-y-1">
      <li
        v-for="item in items"
        :key="item.id"
        class="flex items-center justify-between text-xs text-slate-500 px-3"
      >
        <span>{{ item.name }}（{{ item.kind }}）</span>
        <button
          type="button"
          :data-testid="`equipment-delete-${item.id}`"
          class="text-red-600"
          @click="handleDelete(item.id)"
        >
          刪除
        </button>
      </li>
    </ul>
    <div v-if="editorOpen" data-testid="equipment-editor-panel" class="space-y-2">
      <EquipmentEditor :item="selected" @save="handleSave" />
    </div>
  </section>
</template>
