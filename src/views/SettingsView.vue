<script setup lang="ts">
import { reactive } from 'vue'

import AiBindingPanel from '@/components/ai/AiBindingPanel.vue'
import ProactivitySettings from '@/components/ai/ProactivitySettings.vue'

const props = defineProps<{
  novelId: string
}>()

const cliPaths = reactive({
  codex: '',
  claude: '',
})

const emit = defineEmits<{
  saveCliPaths: [paths: { codex: string; claude: string }]
}>()

function save(): void {
  emit('saveCliPaths', { ...cliPaths })
}
</script>

<template>
  <section data-testid="settings-view" class="p-4 space-y-4">
    <fieldset class="space-y-2">
      <legend class="text-sm font-medium">CLI 執行檔路徑</legend>
      <label class="block">
        <span class="text-xs text-slate-600">Codex</span>
        <input
          v-model="cliPaths.codex"
          data-testid="cli-path-codex"
          type="text"
          class="block w-full rounded-md border-slate-300"
        />
      </label>
      <label class="block">
        <span class="text-xs text-slate-600">Claude</span>
        <input
          v-model="cliPaths.claude"
          data-testid="cli-path-claude"
          type="text"
          class="block w-full rounded-md border-slate-300"
        />
      </label>
      <button
        type="button"
        data-testid="cli-path-save"
        class="px-3 py-1 rounded-md bg-slate-800 text-white text-sm"
        @click="save"
      >
        儲存路徑
      </button>
    </fieldset>
    <AiBindingPanel />
    <ProactivitySettings :novel-id="props.novelId" :character-id="null" />
  </section>
</template>
