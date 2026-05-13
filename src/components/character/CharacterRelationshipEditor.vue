<script setup lang="ts">
import { ref } from 'vue'

import type { Character, Relationship } from '@/types/character'

const props = defineProps<{
  sourceCharacterId: string
  existingRelationships: Relationship[]
  availableCharacters: Character[]
}>()

const emit = defineEmits<{
  add: [rel: Relationship]
  remove: [targetCharacterId: string]
}>()

const target = ref('')
const kind = ref('')
const description = ref('')
const error = ref<string | null>(null)

function handleAdd(): void {
  error.value = null
  const targetId = target.value
  if (targetId === props.sourceCharacterId) {
    error.value = '不可將自己加入 relationship'
    return
  }
  const exists = props.availableCharacters.some((c) => c.id === targetId)
  if (!exists) {
    error.value = '指定的角色不存在'
    return
  }
  emit('add', {
    targetCharacterId: targetId,
    kind: kind.value,
    description: description.value,
  })
  target.value = ''
  kind.value = ''
  description.value = ''
}
</script>

<template>
  <section data-testid="relationship-editor" class="space-y-3">
    <div class="flex gap-2 items-end">
      <label class="flex-1">
        <span class="text-xs text-slate-600">對象</span>
        <select
          v-model="target"
          data-testid="relationship-target"
          class="block w-full rounded-md border-slate-300"
        >
          <option value="" disabled>選擇角色</option>
          <option v-for="c in availableCharacters" :key="c.id" :value="c.id">{{ c.name }}</option>
        </select>
      </label>
      <label class="w-32">
        <span class="text-xs text-slate-600">類型</span>
        <input
          v-model="kind"
          data-testid="relationship-kind"
          type="text"
          class="block w-full rounded-md border-slate-300"
        />
      </label>
      <label class="flex-1">
        <span class="text-xs text-slate-600">描述</span>
        <input
          v-model="description"
          data-testid="relationship-description"
          type="text"
          class="block w-full rounded-md border-slate-300"
        />
      </label>
      <button
        type="button"
        data-testid="relationship-add"
        class="px-3 py-1 rounded-md bg-slate-800 text-white"
        @click="handleAdd"
      >
        新增
      </button>
    </div>
    <p v-if="error" data-testid="relationship-error" class="text-red-600 text-sm">
      {{ error }}
    </p>
    <ul data-testid="relationship-list" class="space-y-1">
      <li
        v-for="rel in existingRelationships"
        :key="rel.targetCharacterId"
        class="flex items-center justify-between px-3 py-1 rounded-md bg-slate-50"
      >
        <span>{{ rel.kind }}：{{ rel.description }}</span>
        <button
          type="button"
          :data-testid="`relationship-remove-${rel.targetCharacterId}`"
          class="text-xs text-red-600"
          @click="emit('remove', rel.targetCharacterId)"
        >
          移除
        </button>
      </li>
    </ul>
  </section>
</template>
