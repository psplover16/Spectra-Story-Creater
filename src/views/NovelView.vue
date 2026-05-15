<script setup lang="ts">
import { ref } from 'vue'

export type NovelTab = 'characters' | 'chapters' | 'factions' | 'worldview' | 'equipment' | 'settings'

const TAB_LABELS: Record<NovelTab, string> = {
  characters: '角色',
  chapters: '章節',
  factions: '陣營',
  worldview: '世界觀',
  equipment: '裝備',
  settings: '設定',
}

const props = defineProps<{
  initialTab?: NovelTab
}>()

const activeTab = ref<NovelTab>(props.initialTab ?? 'characters')

function select(tab: NovelTab): void {
  activeTab.value = tab
}

defineExpose({ activeTab })
</script>

<template>
  <section class="p-4">
    <nav class="flex gap-2 border-b border-slate-200" role="tablist">
      <button
        v-for="(label, key) in TAB_LABELS"
        :key="key"
        :data-testid="`tab-${key}`"
        :aria-selected="activeTab === key"
        :class="[
          'px-3 py-2 text-sm rounded-t-md',
          activeTab === key
            ? 'bg-slate-800 text-white'
            : 'bg-slate-100 text-slate-700 hover:bg-slate-200',
        ]"
        @click="select(key)"
      >
        {{ label }}
      </button>
    </nav>

    <div class="mt-4">
      <div v-if="activeTab === 'characters'" data-testid="panel-characters">
        <slot name="characters" />
      </div>
      <div v-else-if="activeTab === 'chapters'" data-testid="panel-chapters">
        <slot name="chapters" />
      </div>
      <div v-else-if="activeTab === 'factions'" data-testid="panel-factions">
        <slot name="factions" />
      </div>
      <div v-else-if="activeTab === 'worldview'" data-testid="panel-worldview">
        <slot name="worldview" />
      </div>
      <div v-else-if="activeTab === 'equipment'" data-testid="panel-equipment">
        <slot name="equipment" />
      </div>
      <div v-else-if="activeTab === 'settings'" data-testid="panel-settings">
        <slot name="settings" />
      </div>
    </div>
  </section>
</template>
