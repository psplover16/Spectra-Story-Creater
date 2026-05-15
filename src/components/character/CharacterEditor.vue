<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'

import type { Character } from '@/types/character'
import type { EquipmentItem, EquipmentReference } from '@/types/equipment'
import type { Faction } from '@/types/faction'

const props = defineProps<{
  character?: Character | null
  factions?: Faction[]
  otherCharacters?: Character[]
  equipmentLibrary?: EquipmentItem[]
}>()

const emit = defineEmits<{
  save: [
    draft: {
      id?: string
      name: string
      personality: string
      appearance: string
      factionIds: string[]
      equipment: EquipmentReference[]
    },
  ]
}>()

interface ReferenceDraft {
  equipmentId: string
  realEffect?: string
  extraEffect?: string
  realEmpty: boolean
  extraEmpty: boolean
}

function refToDraft(ref: EquipmentReference): ReferenceDraft {
  return {
    equipmentId: ref.equipmentId,
    realEffect: ref.realEffect,
    extraEffect: ref.extraEffect,
    realEmpty: ref.realEffect === '',
    extraEmpty: ref.extraEffect === '',
  }
}

function draftToRef(d: ReferenceDraft): EquipmentReference {
  const ref: EquipmentReference = { equipmentId: d.equipmentId }
  if (d.realEmpty) ref.realEffect = ''
  else if (d.realEffect !== undefined && d.realEffect !== '') ref.realEffect = d.realEffect
  if (d.extraEmpty) ref.extraEffect = ''
  else if (d.extraEffect !== undefined && d.extraEffect !== '') ref.extraEffect = d.extraEffect
  return ref
}

const draft = reactive<{
  id: string | undefined
  name: string
  personality: string
  appearance: string
  factionIds: string[]
  equipment: ReferenceDraft[]
}>({
  id: props.character?.id ?? undefined,
  name: props.character?.name ?? '',
  personality: props.character?.personality ?? '',
  appearance: props.character?.appearance ?? '',
  factionIds: [...(props.character?.factionIds ?? [])],
  equipment: (props.character?.equipment ?? []).map(refToDraft),
})

const error = ref<string | null>(null)
const pendingAddSelection = ref<string>('')

watch(
  () => props.character,
  (next) => {
    draft.id = next?.id ?? undefined
    draft.name = next?.name ?? ''
    draft.personality = next?.personality ?? ''
    draft.appearance = next?.appearance ?? ''
    draft.factionIds = [...(next?.factionIds ?? [])]
    draft.equipment = (next?.equipment ?? []).map(refToDraft)
    error.value = null
  },
)

const libraryById = computed<Map<string, EquipmentItem>>(() => {
  const m = new Map<string, EquipmentItem>()
  for (const item of props.equipmentLibrary ?? []) m.set(item.id, item)
  return m
})

function toggleFaction(factionId: string): void {
  if (draft.factionIds.includes(factionId)) {
    draft.factionIds = draft.factionIds.filter((id) => id !== factionId)
  } else {
    draft.factionIds = [...draft.factionIds, factionId]
  }
}

function addReference(): void {
  if (pendingAddSelection.value === '') return
  if (draft.equipment.some((d) => d.equipmentId === pendingAddSelection.value)) {
    pendingAddSelection.value = ''
    return
  }
  draft.equipment.push({
    equipmentId: pendingAddSelection.value,
    realEffect: undefined,
    extraEffect: undefined,
    realEmpty: false,
    extraEmpty: false,
  })
  pendingAddSelection.value = ''
}

function removeReference(idx: number): void {
  draft.equipment.splice(idx, 1)
}

function setRealEmpty(idx: number, value: boolean): void {
  const item = draft.equipment[idx]
  if (!item) return
  item.realEmpty = value
  if (value) item.realEffect = ''
}

function setExtraEmpty(idx: number, value: boolean): void {
  const item = draft.equipment[idx]
  if (!item) return
  item.extraEmpty = value
  if (value) item.extraEffect = ''
}

function handleSave(): void {
  if (draft.name.trim() === '') {
    error.value = '角色名稱不可為空'
    return
  }
  error.value = null
  emit('save', {
    id: draft.id,
    name: draft.name,
    personality: draft.personality,
    appearance: draft.appearance,
    factionIds: [...draft.factionIds],
    equipment: draft.equipment.map(draftToRef),
  })
}
</script>

<template>
  <form data-testid="character-editor" @submit.prevent="handleSave">
    <label class="block mb-3">
      <span class="text-sm text-slate-700">姓名</span>
      <input
        v-model="draft.name"
        type="text"
        data-testid="character-name"
        class="mt-1 block w-full rounded-md border-slate-300"
      />
    </label>
    <label class="block mb-3">
      <span class="text-sm text-slate-700">性格</span>
      <textarea
        v-model="draft.personality"
        data-testid="character-personality"
        class="mt-1 block w-full rounded-md border-slate-300"
      />
    </label>
    <label class="block mb-3">
      <span class="text-sm text-slate-700">外觀</span>
      <textarea
        v-model="draft.appearance"
        data-testid="character-appearance"
        class="mt-1 block w-full rounded-md border-slate-300"
      />
    </label>
    <div
      v-if="props.factions && props.factions.length > 0"
      class="block mb-3"
      data-testid="character-faction-multiselect"
    >
      <span class="text-sm text-slate-700">陣營（可多選）</span>
      <div class="mt-1 space-y-1">
        <label v-for="f in props.factions" :key="f.id" class="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            :data-testid="`character-faction-checkbox-${f.id}`"
            :checked="draft.factionIds.includes(f.id)"
            @change="toggleFaction(f.id)"
          />
          <span>{{ f.name }}</span>
        </label>
      </div>
      <p
        v-if="draft.factionIds.length === 0"
        data-testid="character-faction-empty-hint"
        class="text-xs text-slate-500 mt-1"
      >
        目前未勾選任何陣營；儲存後此角色將列為「無陣營」。
      </p>
    </div>

    <div class="block mb-3" data-testid="character-equipment-section">
      <span class="text-sm text-slate-700">裝備（多件）</span>
      <ul class="mt-2 space-y-2">
        <li
          v-for="(ref, idx) in draft.equipment"
          :key="`${ref.equipmentId}-${idx}`"
          :data-testid="`equipment-ref-row-${idx}`"
          class="p-2 rounded-md border border-slate-200 space-y-1"
        >
          <div class="flex items-center gap-2">
            <span class="flex-1 text-sm">
              <template v-if="libraryById.get(ref.equipmentId)">
                {{ libraryById.get(ref.equipmentId)!.name }}（{{
                  libraryById.get(ref.equipmentId)!.kind
                }}）
              </template>
              <template v-else>
                <span class="text-slate-400">（已刪除：{{ ref.equipmentId }}）</span>
              </template>
            </span>
            <button
              type="button"
              :data-testid="`equipment-ref-remove-${idx}`"
              class="text-xs text-red-600"
              @click="removeReference(idx)"
            >
              移除
            </button>
          </div>
          <label class="block text-xs text-slate-600">
            真正效果（沿用預設請留空）
            <textarea
              v-model="ref.realEffect"
              :data-testid="`equipment-ref-real-effect-${idx}`"
              class="mt-1 block w-full rounded-md border-slate-300 text-sm"
              rows="2"
              :disabled="ref.realEmpty"
            />
          </label>
          <label class="flex items-center gap-1 text-xs text-slate-600">
            <input
              type="checkbox"
              :data-testid="`equipment-ref-real-empty-${idx}`"
              :checked="ref.realEmpty"
              @change="setRealEmpty(idx, ($event.target as HTMLInputElement).checked)"
            />
            明確無真正效果
          </label>
          <label class="block text-xs text-slate-600">
            額外效果（不疊加請留空）
            <textarea
              v-model="ref.extraEffect"
              :data-testid="`equipment-ref-extra-effect-${idx}`"
              class="mt-1 block w-full rounded-md border-slate-300 text-sm"
              rows="2"
              :disabled="ref.extraEmpty"
            />
          </label>
          <label class="flex items-center gap-1 text-xs text-slate-600">
            <input
              type="checkbox"
              :data-testid="`equipment-ref-extra-empty-${idx}`"
              :checked="ref.extraEmpty"
              @change="setExtraEmpty(idx, ($event.target as HTMLInputElement).checked)"
            />
            明確無額外效果
          </label>
        </li>
      </ul>
      <div
        v-if="(props.equipmentLibrary?.length ?? 0) > 0"
        class="mt-2 flex items-center gap-2"
      >
        <select
          v-model="pendingAddSelection"
          data-testid="equipment-ref-add-select"
          class="rounded-md border-slate-300 text-sm"
        >
          <option value="">（選一件裝備）</option>
          <option v-for="item in props.equipmentLibrary" :key="item.id" :value="item.id">
            {{ item.name }}（{{ item.kind }}）
          </option>
        </select>
        <button
          type="button"
          data-testid="equipment-ref-add-button"
          class="px-2 py-0.5 text-xs rounded-md bg-slate-200 hover:bg-slate-300"
          @click="addReference"
        >
          加入裝備引用
        </button>
      </div>
      <p
        v-else
        class="mt-2 text-xs text-slate-500"
      >
        裝備庫為空；請先到「裝備」分頁建立後再回來引用。
      </p>
    </div>

    <p v-if="error" data-testid="character-error" class="text-red-600 text-sm">
      {{ error }}
    </p>
    <button
      type="submit"
      data-testid="character-save"
      class="px-3 py-1 rounded-md bg-slate-800 text-white"
    >
      儲存
    </button>
  </form>
</template>
